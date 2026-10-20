---
name: java-backend
description: Build Java backend services (default Spring Boot) that follow the base engineering rules for layering, API contracts, configuration, security, and testing. Use when creating or modifying Java or Kotlin backend code, Spring Boot applications, controllers, services, JPA entities, repositories, Maven or Gradle builds, or Java tests.
---

# Java Backend

Applies `backend-layering`, `api-contracts`, `config-and-prompts`,
`security-baseline`, `testing-standards`, and
`observability-and-operations` to Java. Read those for the rules; this
skill shows how they map to code.

## Defaults

| Concern | Default |
|---|---|
| Language | Current Java LTS; records for DTOs and value objects |
| Framework | Spring Boot (current supported major version) |
| Build | Maven (`./mvnw`) or Gradle (`./gradlew`) wrapper, committed |
| Validation | Jakarta Bean Validation (`@Valid`, constraints) on DTOs |
| Security | Spring Security, OAuth2 resource server / OIDC login |
| Persistence | Spring Data JPA or jOOQ; Flyway migrations |
| API contract | `api/openapi.yaml`; springdoc-openapi to verify, or openapi-generator for interfaces |
| Testing | JUnit 5, AssertJ, Mockito (boundaries only), Testcontainers, ArchUnit |
| Quality | Spotless (google-java-format) or Checkstyle; Error Prone or SpotBugs |
| Observability | Spring Boot Actuator, Micrometer, OpenTelemetry |

## Layout

```
src/main/java/com/example/app/
  Application.java                composition root
  config/                         @Configuration, @ConfigurationProperties
  orders/
    api/                          OrderController, OrderRequest/Response records, mappers
    services/                     OrderService (use cases, @Transactional, authorization)
    domain/                       Order, OrderStatus, PricingPolicy, OrderRepository (port)
    infrastructure/               JpaOrderRepository, OrderEntity, PaymentClient
  shared/
    api/                          ProblemDetail exception handler
src/main/resources/
  application.yml                 non-secret defaults only
  db/migration/                   Flyway V1__init.sql ...
prompts/                          LLM prompt files (if used)
src/test/java/com/example/app/
  ArchitectureTest.java           ArchUnit layer rules
```

Package by feature (`orders`, `customers`), layered inside each feature.

## Mapping the rules

**Domain (LAY-02):** no `org.springframework.*` or `jakarta.servlet.*`
imports; no `@Entity` unless an ADR accepts JPA-annotated domain
objects (a common pragmatic choice; never Spring Web types). State
transitions are methods on the entity:

```java
public void approve(Actor actor, Instant now) {
  if (status != OrderStatus.PENDING_APPROVAL) {
    throw new InvalidTransitionException(id, status, OrderStatus.APPROVED);
  }
  status = OrderStatus.APPROVED;
  approvedBy = actor.id();
  approvedAt = now;
}
```

**Services (LAY-03, LAY-06):** constructor injection, `@Transactional`
on public use-case methods, authorization checks here:

```java
@Service
public class OrderService {
  private final OrderRepository orders;   // domain port
  private final Clock clock;

  public OrderService(OrderRepository orders, Clock clock) {
    this.orders = orders;
    this.clock = clock;
  }

  @Transactional
  public Order approve(OrderId id, Actor actor) {
    Order order = orders.findById(id).orElseThrow(() -> new OrderNotFoundException(id));
    if (!actor.hasPermission(Permission.ORDER_APPROVE)) {
      throw new AccessDeniedException("order:approve");
    }
    order.approve(actor, clock.instant());
    return orders.save(order);
  }
}
```

**API (LAY-04, API-02, API-03):** controllers map DTOs and call one
service method. A single `@RestControllerAdvice` maps domain exceptions
to `ProblemDetail` (built into Spring 6+):

```java
@RestControllerAdvice
class ProblemHandler {
  @ExceptionHandler(OrderNotFoundException.class)
  ProblemDetail notFound(OrderNotFoundException e) {
    return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "Order not found");
  }

  @ExceptionHandler(InvalidTransitionException.class)
  ProblemDetail conflict(InvalidTransitionException e) {
    return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, e.getMessage());
  }
}
```

Enable `spring.mvc.problemdetails.enabled=true`, and do not expose stack
traces (`server.error.include-stacktrace=never`).

**Configuration (CFG-02, CFG-03):**

```java
@Validated
@ConfigurationProperties(prefix = "app.pricing")
public record PricingProperties(
    @NotNull @Positive BigDecimal discountThreshold,
    @NotNull @DecimalMin("0") @DecimalMax("1") BigDecimal discountRate) {

  public PricingPolicy toPolicy() {
    return new PricingPolicy(discountThreshold, discountRate);
  }
}
```

Secrets come from environment variables or a secret manager integration
(e.g. `spring.datasource.password=${DB_PASSWORD}`), never committed in
`application.yml`. Do not call `System.getenv` outside `config/`.

**Security (SEC-01, SEC-02, SEC-06):** a `SecurityFilterChain` that
requires authentication by default and lists public endpoints
explicitly; method security (`@PreAuthorize`) or explicit checks in
services; keep CSRF enabled for cookie sessions.

**Money:** `BigDecimal` with explicit scale and `RoundingMode`; never
`double`.

**Persistence (OPS-05):** `spring.jpa.hibernate.ddl-auto=validate` in
all shared environments; schema only via Flyway.

## Testing

- Domain: plain JUnit + AssertJ, no Spring context.
- Services: in-memory fake repositories implementing the ports.
- Repositories: `@DataJpaTest` with Testcontainers (PostgreSQL, not H2).
- API: `@SpringBootTest` + MockMvc or `RestClient`/`WebTestClient`;
  include 401/403/404/409/422 cases.
- Architecture: `ArchitectureTest` from
  `quality-gates/assets/boundaries/java/`.

## Commands

```bash
./mvnw -B verify          # or ./gradlew build
./mvnw spotless:check
```
