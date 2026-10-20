# Placement Examples

One scenario, shown wrong and then right in each backend language.

**Requirement:** Orders whose subtotal exceeds a threshold (currently
500.00) get a discount (currently 5%). The UI shows subtotal, discount,
and total before checkout.

## Wrong: rule in the frontend

```tsx
// CheckoutSummary.tsx: violates SEP-01, SEP-05, CFG-03
export function CheckoutSummary({ items }: { items: CartItem[] }) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = subtotal > 500 ? subtotal * 0.05 : 0;
  const total = subtotal - discount;

  async function placeOrder() {
    // The server trusts a total the user can edit in devtools.
    await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items, total }),
    });
  }
  // ...
}
```

Problems: anyone can post any `total`; a mobile app must re-implement
the rule; changing the threshold needs a frontend release; prices come
from the client; floating-point money.

## Right: the backend owns the rule; the frontend displays it

The API contract has a quote operation and an order operation that take
**intent** (item IDs and quantities), not computed values:

```yaml
# api/openapi.yaml (excerpt)
/quotes:
  post:
    operationId: createQuote
    requestBody:
      content:
        application/json:
          schema: { $ref: '#/components/schemas/QuoteRequest' }
    responses:
      '200':
        content:
          application/json:
            schema: { $ref: '#/components/schemas/Quote' }
components:
  schemas:
    QuoteRequest:
      type: object
      required: [items]
      properties:
        items:
          type: array
          items:
            type: object
            required: [productId, quantity]
            properties:
              productId: { type: string }
              quantity: { type: integer, minimum: 1 }
    Quote:
      type: object
      properties:
        subtotal: { type: string, description: Decimal amount }
        discount: { type: string }
        total: { type: string }
        currency: { type: string }
```

### Java (Spring Boot)

```java
// domain/pricing/PricingPolicy.java: pure domain, no Spring
public record PricingPolicy(BigDecimal discountThreshold,
                            BigDecimal discountRate) {

  public Quote quote(List<PricedLine> lines) {
    BigDecimal subtotal = lines.stream()
        .map(PricedLine::lineTotal)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal discount = subtotal.compareTo(discountThreshold) > 0
        ? subtotal.multiply(discountRate).setScale(2, RoundingMode.HALF_EVEN)
        : BigDecimal.ZERO;
    return new Quote(subtotal, discount, subtotal.subtract(discount));
  }
}

// services/QuoteService.java: use case; prices come from the catalog
@Service
public class QuoteService {
  private final ProductCatalog catalog;     // domain port
  private final PricingPolicy policy;       // built from configuration

  public QuoteService(ProductCatalog catalog, PricingPolicy policy) {
    this.catalog = catalog;
    this.policy = policy;
  }

  public Quote quote(List<RequestedLine> requested) {
    List<PricedLine> lines = requested.stream()
        .map(r -> new PricedLine(catalog.priceOf(r.productId()), r.quantity()))
        .toList();
    return policy.quote(lines);
  }
}

// api/QuoteController.java: thin adapter
@RestController
@RequestMapping("/quotes")
public class QuoteController {
  private final QuoteService quoteService;

  public QuoteController(QuoteService quoteService) {
    this.quoteService = quoteService;
  }

  @PostMapping
  public QuoteResponse create(@Valid @RequestBody QuoteRequest request) {
    return QuoteResponse.from(quoteService.quote(request.toRequestedLines()));
  }
}
```

### Python (FastAPI)

```python
# app/domain/pricing.py: pure domain, no FastAPI/SQLAlchemy
from dataclasses import dataclass
from decimal import ROUND_HALF_EVEN, Decimal


@dataclass(frozen=True)
class PricingPolicy:
    discount_threshold: Decimal
    discount_rate: Decimal

    def quote(self, lines: list["PricedLine"]) -> "Quote":
        subtotal = sum((line.line_total for line in lines), Decimal("0"))
        discount = Decimal("0")
        if subtotal > self.discount_threshold:
            discount = (subtotal * self.discount_rate).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_EVEN
            )
        return Quote(subtotal=subtotal, discount=discount,
                     total=subtotal - discount)


# app/services/quotes.py: use case
class QuoteService:
    def __init__(self, catalog: ProductCatalog, policy: PricingPolicy):
        self._catalog = catalog
        self._policy = policy

    def quote(self, requested: list[RequestedLine]) -> Quote:
        lines = [PricedLine(self._catalog.price_of(r.product_id), r.quantity)
                 for r in requested]
        return self._policy.quote(lines)


# app/api/quotes.py: thin adapter
router = APIRouter(prefix="/quotes")


@router.post("", response_model=QuoteResponse)
def create_quote(body: QuoteRequest,
                 service: QuoteService = Depends(get_quote_service)
                 ) -> QuoteResponse:
    return QuoteResponse.from_domain(service.quote(body.to_requested_lines()))
```

### TypeScript (Node / Fastify)

```ts
// src/domain/pricing.ts: pure domain; amounts in minor units (cents)
export interface PricingPolicy {
  discountThresholdCents: number;
  discountRateBasisPoints: number; // 500 = 5%
}

export function quote(lines: PricedLine[], policy: PricingPolicy): Quote {
  const subtotal = lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
  const discount = subtotal > policy.discountThresholdCents
    ? Math.round((subtotal * policy.discountRateBasisPoints) / 10_000)
    : 0;
  return { subtotalCents: subtotal, discountCents: discount,
           totalCents: subtotal - discount };
}

// src/services/quote-service.ts: use case
export class QuoteService {
  constructor(private catalog: ProductCatalog, private policy: PricingPolicy) {}

  async quote(requested: RequestedLine[]): Promise<Quote> {
    const lines = await Promise.all(requested.map(async (r) => ({
      unitPriceCents: await this.catalog.priceOf(r.productId),
      quantity: r.quantity,
    })));
    return quote(lines, this.policy);
  }
}

// src/api/quotes.ts: thin adapter
app.post('/quotes', { schema: { body: QuoteRequestSchema } }, async (req) =>
  toQuoteResponse(await quoteService.quote(req.body.items)));
```

### Frontend: displays the server's numbers

```tsx
// features/checkout/CheckoutSummary.tsx
export function CheckoutSummary({ items }: { items: CartLine[] }) {
  const { data: quote, isPending } = useQuote(items); // calls POST /quotes via api client

  if (isPending || !quote) return <Spinner />;
  return (
    <dl>
      <dt>Subtotal</dt><dd>{formatMoney(quote.subtotal, quote.currency)}</dd>
      <dt>Discount</dt><dd>{formatMoney(quote.discount, quote.currency)}</dd>
      <dt>Total</dt><dd>{formatMoney(quote.total, quote.currency)}</dd>
    </dl>
  );
}
// Placing the order posts items only; the server re-quotes and stores the total.
```

The threshold and rate come from configuration (CFG-03); the rule is
tested once, in the backend domain (TST-01); the frontend test checks
only that the server's values are rendered (TST-08).

## Authorization example

```ts
// Wrong: the only check is in the UI (SEP-02)
{user.role === 'manager' && <button onClick={approve}>Approve</button>}
```

Right: the server enforces it, and tells the UI what is allowed.

```json
GET /orders/123
{ "id": "123", "status": "PENDING_APPROVAL",
  "allowedActions": ["approve", "reject"] }
```

```tsx
{order.allowedActions.includes('approve') && <button onClick={approve}>Approve</button>}
```

`POST /orders/123/approve` re-checks permission and the state
transition on the server and returns 403 or 409 when not allowed.
