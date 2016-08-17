# About
This project aims to provide an alternative JavaScript engine to Alfresco based on the Nashorn engine included in Java 8 and above. It is the latest in a series of attempts of mine to improve the scripting experience within Alfresco.

It started with my [Enhanced Script Environment](https://github.com/AFaust/alfresco-enhanced-script-environment/) ([Summit 2013 session](https://summit.alfresco.com/barcelona/sessions/enhanced-script-api-dynamic-import-batch-processing)) which aimed to address various issues with Rhino based integration in standard Alfresco, especially Java <-> JavaScript conversions as well as transparent, native-like use of Java lists and maps, and avoiding leaks of JavaScript objects into Java or FreeMarker environments. After realizing that this was unachievable without a complete refactoring of the Alfresco Rhino integration or ending up with an unmaintainable mess, I started a [proof of concept branch](https://github.com/AFaust/alfresco-enhanced-script-environment/tree/nashorn_PoC) for using the Nashorn engine in Alfresco ([Summit 2014 Lightning Talk](https://youtu.be/t50IVAxpD3E?t=1057)).

This project now is about implementing a proper, production-ready script engine for Alfresco based on Nashorn. It is designed to implement a completely isolated, separate script engine to allow both Rhino and Nashorn to be used on the same Alfresco instance side-by-side without any side-effects. To ensure safe coexistence, the script engine provides a separate script API implementation, which draws inspiration from the existing API (and tries to come as close as possible), but aims to cut off as many legacy Rhino hacks / weirdness as possible. The new script API is designed to support modularisation from the start and uses a variant of the AMD module loading mechanism also used in Aikau, so anyone who has written Aikau modules before should feel right at home.

# Current state
This project contains three modules. The Repository-tier module is currently the only one that provides a custom script engine (implementing a Nashorn script engine for Share / Surf is a planned TODO-item for the future). The Share-tier module provides a customization / extension to the work-in-progress [Aikau-ified JavaScript Console](https://github.com/AFaust/js-console/tree/js-console-v2) so new script API modules can be easily prototyped in a running system and don't require frequent restarts to test.
The *jdk8-workarounds* module produces a JAR-file that can be placed inside the *jdk_home/jre/lib/ext/* folder to work around issues that will only be addressed in JDK 9, i.e. [JDK-8160435](https://bugs.openjdk.java.net/browse/JDK-8160435)

# Requirements
Since Nashorn has been introduced in Java 8 and is actively being developed, the addon can only be installed and used on Alfresco versions that support Java 8, so Alfresco 5.0 and newer. Since the project is trying to make use of new improvements in the Nashorn engine as soon as they are available, the newest version of the Java 8 JDK (Oracle or OpenJDK) should always be used. Since neither Tomcat nor Alfresco currently fully supports running on early-access releases of JDK 9, no features / improvements of that release are currently being used in the project, even though they may provide significant impact. The addon is currently "forced" to use internal JDK API that will become inaccessible in JDK 9 and thus will likely not work on any early-access release.

# Building
In order to build the project, please make sure the `JAVA_HOME` and `PATH` environment variables are pointing to a JDK 8 installation. This is required both for linking Java code to Nashorn APIs as well as running unit tests that are actually being implemented as Nashorn scripts.

Building the project requires the use of the Maven command
```
mvn install
```

The Repository-tier module includes a JSDoc reporting plugin to produce basic documentation of the script API modules. This requires that the Maven build is run to generate a site, e.g.
```
mvn site
```

It is possible to combine a normal build with the generation of a site by simply listing both `install` and `site` as parameters to the Maven executable.

# Usage details
Details about the usage of the Nashorn script engine modules is separated into the README files of the individual modules:

- [Repository-tier](./repository)
- [Share-tier](./share)
- [JDK 8 workarounds](./jdk8-workarounds)