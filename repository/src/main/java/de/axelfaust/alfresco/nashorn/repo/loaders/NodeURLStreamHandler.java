/*
 * Copyright 2015, 2016 Axel Faust
 *
 * Licensed under the Eclipse Public License (EPL), Version 1.0 (the "License"); you may not use
 * this file except in compliance with the License. You may obtain a copy of the License at
 *
 * https://www.eclipse.org/legal/epl-v10.html
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the
 * License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 */
package de.axelfaust.alfresco.nashorn.repo.loaders;

import java.io.IOException;
import java.io.Serializable;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLStreamHandler;
import java.text.MessageFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.alfresco.model.ContentModel;
import org.alfresco.repo.security.authentication.AuthenticationUtil;
import org.alfresco.repo.security.authentication.AuthenticationUtil.RunAsWork;
import org.alfresco.repo.tenant.TenantUtil;
import org.alfresco.repo.transaction.TransactionalResourceHelper;
import org.alfresco.service.ServiceRegistry;
import org.alfresco.service.cmr.dictionary.DataTypeDefinition;
import org.alfresco.service.cmr.dictionary.DictionaryService;
import org.alfresco.service.cmr.dictionary.PropertyDefinition;
import org.alfresco.service.cmr.repository.ChildAssociationRef;
import org.alfresco.service.cmr.repository.ContentService;
import org.alfresco.service.cmr.repository.NodeRef;
import org.alfresco.service.cmr.repository.NodeService;
import org.alfresco.service.cmr.repository.Path;
import org.alfresco.service.cmr.repository.Path.ChildAssocElement;
import org.alfresco.service.cmr.repository.Path.Element;
import org.alfresco.service.cmr.repository.StoreRef;
import org.alfresco.service.cmr.search.QueryConsistency;
import org.alfresco.service.cmr.search.ResultSet;
import org.alfresco.service.cmr.search.ResultSetRow;
import org.alfresco.service.cmr.search.SearchParameters;
import org.alfresco.service.cmr.search.SearchService;
import org.alfresco.service.cmr.security.AccessStatus;
import org.alfresco.service.cmr.security.PermissionService;
import org.alfresco.service.namespace.NamespaceService;
import org.alfresco.service.namespace.QName;
import org.alfresco.service.namespace.RegexQNamePattern;
import org.alfresco.util.Pair;
import org.alfresco.util.ParameterCheck;
import org.alfresco.util.transaction.TransactionSupportUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * This class provides the resolution and stream handling capabilities for node-based AMD script loaders. This could also be (and previously
 * was) implemented in JavaScript. (Currently) Limited debugger support would make it hard to debug such a key component and performance may
 * also improve from a pure-Java implementation.
 *
 * @author Axel Faust
 */
public class NodeURLStreamHandler extends URLStreamHandler
{

    private static final Logger LOGGER = LoggerFactory.getLogger(NodeURLStreamHandler.class);

    private static final String TXN_MODULE_ID_RESOLUTION_KEY_PREFIX = NodeURLStreamHandler.class.getName() + "-moduleIdResolution-";

    private static final String TXN_LAST_MODULE_ID_KEY = NodeURLStreamHandler.class.getName() + "-lastModuleIdResolution";

    protected final NamespaceService namespaceService;

    protected final DictionaryService dictionaryService;

    protected final NodeService nodeService;

    protected final PermissionService permissionService;

    protected final ContentService contentService;

    protected final SearchService searchService;

    public NodeURLStreamHandler(final ServiceRegistry serviceRegistry)
    {
        this(serviceRegistry.getNamespaceService(), serviceRegistry.getDictionaryService(), serviceRegistry.getNodeService(),
                serviceRegistry.getPermissionService(), serviceRegistry.getContentService(), serviceRegistry.getSearchService());
    }

    public NodeURLStreamHandler(final NamespaceService namespaceService, final DictionaryService dictionaryService,
            final NodeService nodeService, final PermissionService permissionService, final ContentService contentService,
            final SearchService searchService)
    {
        ParameterCheck.mandatory("namespaceService", namespaceService);
        ParameterCheck.mandatory("dictionaryService", dictionaryService);
        ParameterCheck.mandatory("nodeService", nodeService);
        ParameterCheck.mandatory("contentService", contentService);
        ParameterCheck.mandatory("searchService", searchService);

        this.namespaceService = namespaceService;
        this.dictionaryService = dictionaryService;
        this.nodeService = nodeService;
        this.permissionService = permissionService;
        this.contentService = contentService;
        this.searchService = searchService;
    }

    public String normalizeModuleId(final String scriptContextUuid, final String moduleId)
    {
        ParameterCheck.mandatoryString("scriptContextUuid", scriptContextUuid);
        ParameterCheck.mandatoryString("moduleId", moduleId);

        // normalize as system to avoid issues when admin / dev defined "../../path/to/script" temporarily navigated into a structure
        // inaccessible to the current user (primary concern is that resolved script node must be accessible)
        final String normalizedModuleId = AuthenticationUtil.runAsSystem(new RunAsWork<String>()
        {

            /**
             * {@inheritDoc}
             */
            @Override
            public String doWork()
            {
                return NodeURLStreamHandler.this.normalizeModuleIdImpl(scriptContextUuid, moduleId);
            }
        });

        return normalizedModuleId;
    }

    protected String normalizeModuleIdImpl(final String scriptContextUuid, final String moduleId)
    {
        final String normalizedModuleId;

        Pair<NodeRef, QName> contentNodeAndProperty;

        if (TransactionSupportUtil.isActualTransactionActive())
        {
            final Map<Pair<String, String>, Pair<NodeRef, QName>> moduleResolution = TransactionalResourceHelper
                    .getMap(TXN_MODULE_ID_RESOLUTION_KEY_PREFIX + scriptContextUuid);

            final Pair<String, String> key = new Pair<>(TenantUtil.getCurrentDomain(), moduleId);
            contentNodeAndProperty = moduleResolution.get(key);
            if (contentNodeAndProperty == null)
            {
                contentNodeAndProperty = this.resolveToContentNode(moduleId);

                if (contentNodeAndProperty != null)
                {
                    // in case the unnormalized module ID will be requested again
                    moduleResolution.put(key, contentNodeAndProperty);
                }
            }
        }
        else
        {
            contentNodeAndProperty = this.resolveToContentNode(moduleId);
        }

        if (contentNodeAndProperty != null)
        {
            final NodeRef contentNode = contentNodeAndProperty.getFirst();
            if (contentNode != null)
            {
                final StringBuilder normalizedIdBuilder = new StringBuilder();
                normalizedIdBuilder.append(contentNode.getStoreRef().getProtocol());
                normalizedIdBuilder.append('/');
                normalizedIdBuilder.append(contentNode.getStoreRef().getIdentifier());

                final Path path = this.nodeService.getPath(contentNode);
                for (final Element element : path)
                {
                    if (element instanceof ChildAssocElement)
                    {
                        final NodeRef childRef = ((ChildAssocElement) element).getRef().getChildRef();
                        final Serializable name = this.nodeService.getProperty(childRef, ContentModel.PROP_NAME);

                        normalizedIdBuilder.append('/');
                        normalizedIdBuilder.append(name);
                    }
                }

                final QName contentProperty = contentNodeAndProperty.getSecond();
                if (contentProperty != null && !ContentModel.PROP_CONTENT.equals(contentProperty))
                {
                    normalizedIdBuilder.append('/');
                    normalizedIdBuilder.append(contentProperty.toPrefixString(this.namespaceService).replaceFirst(":", "_"));
                }

                normalizedModuleId = normalizedIdBuilder.toString();

                if (TransactionSupportUtil.isActualTransactionActive())
                {
                    final Map<Pair<String, String>, Pair<NodeRef, QName>> moduleResolution = TransactionalResourceHelper
                            .getMap(TXN_MODULE_ID_RESOLUTION_KEY_PREFIX + scriptContextUuid);

                    final Pair<String, String> key = new Pair<>(TenantUtil.getCurrentDomain(), normalizedModuleId);
                    moduleResolution.put(key, contentNodeAndProperty);

                    final Map<String, Pair<NodeRef, QName>> lastModuleId = TransactionalResourceHelper.getMap(TXN_LAST_MODULE_ID_KEY);
                    lastModuleId.put(normalizedModuleId, contentNodeAndProperty);
                }

                LOGGER.debug("Normalized {} to {}", moduleId, normalizedModuleId);
            }
            else
            {
                normalizedModuleId = moduleId;
            }
        }
        else
        {
            normalizedModuleId = moduleId;
        }

        return normalizedModuleId;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    protected URLConnection openConnection(final URL u) throws IOException
    {
        final String runAsUser = AuthenticationUtil.getRunAsUser();
        final URLConnection urlConnection = AuthenticationUtil.runAsSystem(new RunAsWork<URLConnection>()
        {

            /**
             * {@inheritDoc}
             */
            @Override
            public URLConnection doWork()
            {
                return NodeURLStreamHandler.this.openConnectionImpl(u, runAsUser);
            }
        });

        // above resolution as system may implicitly expose existence of path identifiers
        // not resolving as system on the other hand would slow execution down and inconvenience developers of script modules

        if (urlConnection == null)
        {
            throw new IOException("Cannot resolve url " + u);
        }

        return urlConnection;
    }

    protected URLConnection openConnectionImpl(final URL u, final String runAsUser)
    {
        final String moduleId = u.getFile();

        Pair<NodeRef, QName> contentNodeAndProperty;
        if (TransactionSupportUtil.isActualTransactionActive())
        {
            final Map<String, Pair<NodeRef, QName>> map = TransactionalResourceHelper.getMap(TXN_LAST_MODULE_ID_KEY);

            contentNodeAndProperty = map.get(moduleId);
            if (contentNodeAndProperty == null)
            {
                contentNodeAndProperty = this.resolveToContentNode(moduleId);
            }
        }
        else
        {
            contentNodeAndProperty = this.resolveToContentNode(moduleId);
        }

        // TODO Refactor to use standard ScriptFileURLConnection and sub-class of AbstractNodeScriptFile
        URLConnection con = null;
        if (contentNodeAndProperty != null)
        {
            final NodeRef contentNode = contentNodeAndProperty.getFirst();
            if (contentNode != null)
            {
                final AccessStatus accessStatus = AuthenticationUtil.runAs(new RunAsWork<AccessStatus>()
                {

                    @Override
                    public AccessStatus doWork() throws Exception
                    {
                        return NodeURLStreamHandler.this.permissionService.hasReadPermission(contentNode);
                    }

                }, runAsUser);

                if (accessStatus == AccessStatus.ALLOWED)
                {
                    if (contentNodeAndProperty.getSecond() != null)
                    {
                        con = new NodeURLConnection(u, this.nodeService, this.contentService, contentNode,
                                contentNodeAndProperty.getSecond());
                    }
                    else
                    {
                        con = new NodeURLConnection(u, this.nodeService, this.contentService, contentNode);
                    }
                }
            }
        }

        return con;
    }

    protected Pair<NodeRef, QName> resolveToContentNode(final String moduleId)
    {
        final Pair<NodeRef, String[]> contextAndPath = this.resolveToContextAndPath(moduleId);
        final Pair<NodeRef, QName> contentNodeAndProperty = this
                .resolveToContentNode(contextAndPath.getFirst(), contextAndPath.getSecond());

        LOGGER.debug("Resolved node {} and property {} from module id {}", contentNodeAndProperty.getFirst(),
                contentNodeAndProperty.getSecond(), moduleId);

        return contentNodeAndProperty;
    }

    protected Pair<NodeRef, String[]> resolveToContextAndPath(final String moduleId)
    {
        ParameterCheck.mandatoryString("moduleId", moduleId);

        final String[] moduleIdFragments = moduleId.split(":?/+");

        String[] pathFragments;
        StoreRef contextStore;
        NodeRef contextNode = null;

        // default
        contextStore = StoreRef.STORE_REF_WORKSPACE_SPACESSTORE;
        pathFragments = moduleIdFragments;

        if (moduleIdFragments.length >= 3)
        {
            final StoreRef potentialStoreRef = new StoreRef(moduleIdFragments[0], moduleIdFragments[1]);

            if (this.nodeService.exists(potentialStoreRef))
            {
                contextStore = potentialStoreRef;
                final StringBuilder uuidBuilder = new StringBuilder();

                for (int idx = 2; idx < moduleIdFragments.length; idx++)
                {
                    if (uuidBuilder.length() > 0)
                    {
                        uuidBuilder.append('/');
                    }
                    uuidBuilder.append(moduleIdFragments[idx]);

                    final NodeRef potentialNodeRef = new NodeRef(potentialStoreRef, uuidBuilder.toString());
                    if (this.nodeService.exists(potentialNodeRef))
                    {
                        contextNode = potentialNodeRef;
                        pathFragments = new String[moduleIdFragments.length - (idx + 1)];
                        System.arraycopy(moduleIdFragments, idx + 1, pathFragments, 0, pathFragments.length);
                        break;
                    }
                }

                if (contextNode == null)
                {
                    pathFragments = new String[moduleIdFragments.length - 2];
                    System.arraycopy(moduleIdFragments, 2, pathFragments, 0, pathFragments.length);
                }
            }
        }

        if (contextNode == null)
        {
            contextNode = this.nodeService.getRootNode(contextStore);
        }

        LOGGER.trace("Determined context {} and relative path fragments {} from module fragments {}", contextNode, pathFragments,
                moduleIdFragments);

        final Pair<NodeRef, String[]> result = new Pair<>(contextNode, pathFragments);
        return result;
    }

    protected Pair<NodeRef, QName> resolveToContentNode(final NodeRef nodeRef, final String... pathFragments)
    {
        final NodeRef contentNode;
        final QName contentProperty;

        if (pathFragments.length == 0)
        {
            if (this.isContentNode(nodeRef))
            {
                contentNode = nodeRef;
                contentProperty = ContentModel.PROP_CONTENT;
            }
            else
            {
                contentNode = null;
                contentProperty = null;
            }
        }
        else
        {
            final Pair<NodeRef, String[]> withPotentialRemainder = this.resolvePathWithPotentialRemainder(nodeRef, pathFragments);
            final NodeRef resolvedNode = withPotentialRemainder.getFirst();

            if (this.isContentNode(resolvedNode))
            {
                final String[] remainder = withPotentialRemainder.getSecond();
                if (remainder.length == 0)
                {
                    contentNode = resolvedNode;
                    contentProperty = ContentModel.PROP_CONTENT;
                }
                else if (remainder.length == 1)
                {
                    final QName potentialContentProperty = QName.resolveToQName(this.namespaceService, remainder[0].replaceFirst("_", ":"));
                    if (potentialContentProperty != null)
                    {
                        final PropertyDefinition property = this.dictionaryService.getProperty(potentialContentProperty);
                        if (property != null && DataTypeDefinition.CONTENT.equals(property.getDataType().getName()))
                        {
                            contentNode = resolvedNode;
                            contentProperty = potentialContentProperty;
                        }
                        else
                        {
                            contentNode = null;
                            contentProperty = null;
                        }
                    }
                    else
                    {
                        contentNode = null;
                        contentProperty = null;
                    }
                }
                else
                {
                    contentNode = null;
                    contentProperty = null;
                }
            }
            else
            {
                contentNode = null;
                contentProperty = null;
            }
        }

        final Pair<NodeRef, QName> result = new Pair<>(contentNode, contentProperty);
        return result;
    }

    protected Pair<NodeRef, String[]> resolvePathWithPotentialRemainder(final NodeRef root, final String... pathFragments)
    {
        NodeRef currentParent = root;
        NodeRef resolvedNode = null;
        final List<String> remainderFragments = new ArrayList<String>();

        for (int idx = 0; idx < pathFragments.length; idx++)
        {
            final String fragment = pathFragments[idx];
            if (resolvedNode == null)
            {
                final NodeRef childByName = this.childByName(currentParent, fragment, idx >= pathFragments.length - 2);
                if (childByName != null)
                {
                    currentParent = childByName;
                }
                else
                {
                    resolvedNode = currentParent;
                    remainderFragments.add(fragment);
                }
            }
            else
            {
                remainderFragments.add(fragment);
            }
        }

        LOGGER.debug("Resolved {} with remainder {} from root {} via fragments {}", resolvedNode, remainderFragments, root, pathFragments);

        final Pair<NodeRef, String[]> result = new Pair<>(resolvedNode != null ? resolvedNode : root,
                remainderFragments.toArray(new String[0]));

        return result;
    }

    protected NodeRef childByName(final NodeRef parent, final String fragment, final boolean alternativeNameCheck)
    {
        NodeRef childByName;

        final QName parentType = this.nodeService.getType(parent);
        if (this.dictionaryService.isSubClass(parentType, ContentModel.TYPE_FOLDER))
        {
            childByName = this.nodeService.getChildByName(parent, ContentModel.ASSOC_CONTAINS, fragment);

            LOGGER.trace("Resolved {} as cm:contains child by name {} of {}", childByName, fragment, parent);

            if (childByName == null && alternativeNameCheck && fragment.indexOf('.') == -1)
            {
                childByName = this.nodeService.getChildByName(parent, ContentModel.ASSOC_CONTAINS, fragment + ".nashornjs");

                LOGGER.trace("Resolved {} as cm:contains child by name {}.nashornjs of {}", childByName, fragment, parent);

                if (childByName == null)
                {
                    childByName = this.nodeService.getChildByName(parent, ContentModel.ASSOC_CONTAINS, fragment + ".js");

                    LOGGER.trace("Resolved {} as cm:contains child by name {}.js of {}", childByName, fragment, parent);
                }
            }
        }
        else if (this.dictionaryService.isSubClass(ContentModel.TYPE_CONTAINER, parentType))
        {
            childByName = this.childByName(parent, fragment, ContentModel.ASSOC_CHILDREN);

            LOGGER.trace("Resolved {} as sys:children child by name {} of {}", childByName, fragment, parent);

            if (childByName == null && alternativeNameCheck && fragment.indexOf('.') == -1)
            {
                childByName = this.childByName(parent, fragment + ".nashornjs", ContentModel.ASSOC_CHILDREN);

                LOGGER.trace("Resolved {} as sys:children child by name {}.nashornjs of {}", childByName, fragment, parent);

                if (childByName == null)
                {
                    childByName = this.childByName(parent, fragment + ".js", ContentModel.ASSOC_CHILDREN);

                    LOGGER.trace("Resolved {} as sys:children child by name {}.js of {}", childByName, fragment, parent);
                }
            }
        }
        else
        {
            childByName = null;
        }

        LOGGER.debug("Resolved {} as child by fragment {} of {} (alternativeNameCheck={})", childByName, fragment, parent,
                Boolean.valueOf(alternativeNameCheck));

        return childByName;
    }

    protected NodeRef childByName(final NodeRef parent, final String name, final QName assocTypeQName)
    {
        // would be greate if MDQ supported selection by child assoc tyoe
        final String query = MessageFormat.format("PARENT:\"{0}\" AND =cm:name:\"{1}\"", parent, name.replace("\"", "\\\""));

        final SearchParameters sp = new SearchParameters();
        sp.setQuery(query);
        sp.setLanguage(SearchService.LANGUAGE_FTS_ALFRESCO);
        sp.setQueryConsistency(QueryConsistency.TRANSACTIONAL);
        sp.addStore(parent.getStoreRef());

        NodeRef child = null;
        final ResultSet resultSet = this.searchService.query(sp);
        try
        {
            for (final ResultSetRow row : resultSet)
            {
                final NodeRef node = row.getNodeRef();

                final List<ChildAssociationRef> parentAssocs = this.nodeService.getParentAssocs(node, assocTypeQName,
                        RegexQNamePattern.MATCH_ALL);

                boolean continueResultChecks = true;
                for (final ChildAssociationRef parentAssoc : parentAssocs)
                {
                    if (parentAssoc.getParentRef().equals(parent))
                    {
                        if (child == null)
                        {
                            child = node;
                        }
                        else
                        {
                            child = null;
                            continueResultChecks = false;
                            break;
                        }
                    }
                }

                if (!continueResultChecks)
                {
                    break;
                }
            }
        }
        finally
        {
            resultSet.close();
        }

        return child;
    }

    protected boolean isContentNode(final NodeRef node)
    {
        final QName nodeType = this.nodeService.getType(node);
        final boolean isContentNode = this.dictionaryService.isSubClass(nodeType, ContentModel.TYPE_CONTENT);
        return isContentNode;
    }
}
