// -------------------------------------------------------------------
// ArchitectureTest.java: ArchUnit tests for backend layer rules
//
// Copyright (C) 2026 Sumanth Vepa.
//
// This program is free software: you can redistribute it and/or
// modify it under the terms of the GNU General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see
// <https://www.gnu.org/licenses/>.
// -------------------------------------------------------------------

// Copy to src/test/java/<base package>/ArchitectureTest.java and replace
// com.example.app with your base package.
//
// Test dependency (Maven):
//   <dependency>
//     <groupId>com.tngtech.archunit</groupId>
//     <artifactId>archunit-junit5</artifactId>
//     <version>${archunit.version}</version>   <!-- use the current release -->
//     <scope>test</scope>
//   </dependency>
//
// Enforces backend-layering (LAY-02 .. LAY-07) and parts of
// config-and-prompts (CFG-02) and observability (OPS-01).

package com.example.app;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noMethods;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(
    packages = "com.example.app",
    importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

  /** LAY-01, LAY-03, LAY-05: dependency direction between layers. */
  @ArchTest
  static final ArchRule layers =
      layeredArchitecture()
          .consideringOnlyDependenciesInLayers()
          .layer("Api").definedBy("..api..")
          .layer("Services").definedBy("..services..")
          .layer("Domain").definedBy("..domain..")
          .layer("Infrastructure").definedBy("..infrastructure..")
          .whereLayer("Api").mayNotBeAccessedByAnyLayer()
          .whereLayer("Services").mayOnlyBeAccessedByLayers("Api")
          .whereLayer("Infrastructure").mayNotBeAccessedByAnyLayer()
          .whereLayer("Domain")
          .mayOnlyBeAccessedByLayers("Api", "Services", "Infrastructure");

  /** LAY-02: the domain is free of web, persistence, IO, and logging frameworks. */
  @ArchTest
  static final ArchRule domainIsFrameworkFree =
      noClasses()
          .that().resideInAPackage("..domain..")
          .should().dependOnClassesThat().resideInAnyPackage(
              "org.springframework..",
              "jakarta.servlet..",
              "jakarta.ws..",
              "jakarta.persistence..",   // remove if an ADR allows JPA-annotated domain objects
              "org.hibernate..",         // remove together with the line above
              "java.sql..",
              "java.net.http..",
              "com.fasterxml.jackson..",
              "org.slf4j..")
          .because("domain code must be plain Java (LAY-02)");

  /** LAY-04: controllers do not touch repositories directly. */
  @ArchTest
  static final ArchRule apiDoesNotUseRepositories =
      noClasses()
          .that().resideInAPackage("..api..")
          .should().dependOnClassesThat().haveSimpleNameEndingWith("Repository")
          .because("controllers call services, not repositories (LAY-04)");

  /** LAY-06: transactions are opened in services, not controllers. */
  @ArchTest
  static final ArchRule noTransactionsInApi =
      noMethods()
          .that().areDeclaredInClassesThat().resideInAPackage("..api..")
          .should().beAnnotatedWith("org.springframework.transaction.annotation.Transactional")
          .because("transactions belong to service use cases (LAY-06)");

  @ArchTest
  static final ArchRule noTransactionalApiClasses =
      noClasses()
          .that().resideInAPackage("..api..")
          .should().beAnnotatedWith("org.springframework.transaction.annotation.Transactional")
          .because("transactions belong to service use cases (LAY-06)");

  /** CFG-02: environment variables are read only by configuration code. */
  @ArchTest
  static final ArchRule envReadOnlyInConfig =
      noClasses()
          .that().resideOutsideOfPackage("..config..")
          .should().callMethod(System.class, "getenv", String.class)
          .orShould().callMethod(System.class, "getenv")
          .because("configuration is loaded once into typed properties (CFG-02)");

  /** OPS-01: log through the logging framework. */
  @ArchTest
  static final ArchRule noStandardStreams = NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS;

  /** LAY-07: no cycles between feature packages. */
  @ArchTest
  static final ArchRule noCycles =
      slices().matching("com.example.app.(*)..").should().beFreeOfCycles();
}
