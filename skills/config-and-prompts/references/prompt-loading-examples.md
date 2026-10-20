# Prompt Loading Examples

Prompt loading and model calls are **infrastructure** concerns
(`backend-layering`). Services depend on a domain port such as
`OrderSummarizer`; the infrastructure adapter loads the prompt, calls
the model, and validates the output.

All three loaders below do the same things:

1. Resolve the active version from configuration.
2. Read `prompts/<id>/v<version>.md`, split front matter from body.
3. Check at load time that the placeholders in the body match the
   declared `variables`.
4. At render time, require exactly the declared variables, and
   neutralize delimiter tags inside untrusted values.

## Python

```python
# app/infrastructure/prompts.py
import re
from collections.abc import Mapping
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

_PLACEHOLDER = re.compile(r"\{\{(\w+)\}\}")


@dataclass(frozen=True)
class PromptTemplate:
    id: str
    version: int
    variables: frozenset[str]
    body: str
    params: Mapping[str, Any] = field(default_factory=dict)

    def render(self, values: Mapping[str, str]) -> str:
        supplied = set(values)
        if supplied != self.variables:
            raise ValueError(
                f"prompt {self.id} v{self.version}: expected "
                f"{sorted(self.variables)}, got {sorted(supplied)}"
            )
        return _PLACEHOLDER.sub(
            lambda m: _neutralize(values[m.group(1)]), self.body
        )


def _neutralize(value: str) -> str:
    # Stop untrusted text from closing a delimiter like </orders>.
    return value.replace("<", "&lt;").replace(">", "&gt;")


class PromptLoader:
    def __init__(self, root: Path, active_versions: Mapping[str, int]):
        self._root = root
        self._active = active_versions

    def get(self, prompt_id: str) -> PromptTemplate:
        version = self._active[prompt_id]
        path = self._root / prompt_id / f"v{version}.md"
        _, front, body = path.read_text(encoding="utf-8").split("---", 2)
        meta = yaml.safe_load(front)
        declared = frozenset(meta["variables"])
        used = frozenset(_PLACEHOLDER.findall(body))
        if used != declared:
            raise ValueError(f"{path}: placeholders {sorted(used)} "
                             f"!= variables {sorted(declared)}")
        params = {k: v for k, v in meta.items()
                  if k not in {"id", "version", "variables"}}
        return PromptTemplate(meta["id"], meta["version"], declared,
                              body.strip(), params)
```

`active_versions` and the model alias map come from the settings
object (CFG-02, CFG-08), e.g.
`PROMPT_VERSIONS='{"order-summary": 2}'`,
`LLM_MODELS='{"summary": "<model-id>"}'`.

## TypeScript

```ts
// src/infrastructure/prompts.ts
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

const PLACEHOLDER = /\{\{(\w+)\}\}/g;

export interface PromptTemplate {
  id: string;
  version: number;
  variables: ReadonlySet<string>;
  body: string;
  params: Record<string, unknown>;
}

const neutralize = (v: string) => v.replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function render(t: PromptTemplate, values: Record<string, string>): string {
  const supplied = Object.keys(values).sort().join(',');
  const expected = [...t.variables].sort().join(',');
  if (supplied !== expected) {
    throw new Error(`prompt ${t.id} v${t.version}: expected [${expected}], got [${supplied}]`);
  }
  return t.body.replace(PLACEHOLDER, (_, name: string) => neutralize(values[name]));
}

export class PromptLoader {
  constructor(private root: string, private active: Record<string, number>) {}

  async get(id: string): Promise<PromptTemplate> {
    const version = this.active[id];
    const file = path.join(this.root, id, `v${version}.md`);
    const [, front, ...rest] = (await readFile(file, 'utf8')).split('---');
    const body = rest.join('---').trim();
    const meta = parse(front) as Record<string, unknown> & { variables: string[] };
    const declared = new Set(meta.variables);
    const used = new Set([...body.matchAll(PLACEHOLDER)].map((m) => m[1]));
    if (used.size !== declared.size || [...used].some((u) => !declared.has(u))) {
      throw new Error(`${file}: placeholders do not match declared variables`);
    }
    const { id: _id, version: _v, variables: _vars, ...params } = meta;
    return { id, version, variables: declared, body, params };
  }
}
```

## Java

```java
// infrastructure/prompts/PromptLoader.java
public final class PromptLoader {
  private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{(\\w+)}}");

  private final Path root;
  private final Map<String, Integer> activeVersions;

  public PromptLoader(Path root, Map<String, Integer> activeVersions) {
    this.root = root;
    this.activeVersions = Map.copyOf(activeVersions);
  }

  public PromptTemplate get(String id) throws IOException {
    int version = activeVersions.get(id);
    Path file = root.resolve(id).resolve("v" + version + ".md");
    String[] parts = Files.readString(file).split("---", 3);
    Map<String, Object> meta = new Yaml().load(parts[1]);
    String body = parts[2].strip();

    @SuppressWarnings("unchecked")
    Set<String> declared = Set.copyOf((List<String>) meta.get("variables"));
    Set<String> used = PLACEHOLDER.matcher(body).results()
        .map(m -> m.group(1)).collect(Collectors.toSet());
    if (!used.equals(declared)) {
      throw new IllegalStateException(file + ": placeholders " + used
          + " != variables " + declared);
    }
    return new PromptTemplate(id, version, declared, body, meta);
  }
}

// infrastructure/prompts/PromptTemplate.java
public record PromptTemplate(String id, int version, Set<String> variables,
                             String body, Map<String, Object> params) {

  public String render(Map<String, String> values) {
    if (!values.keySet().equals(variables)) {
      throw new IllegalArgumentException("prompt " + id + " v" + version
          + ": expected " + variables + ", got " + values.keySet());
    }
    return PLACEHOLDER.matcher(body).replaceAll(m ->
        Matcher.quoteReplacement(neutralize(values.get(m.group(1)))));
  }

  private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{(\\w+)}}");

  private static String neutralize(String v) {
    return v.replace("<", "&lt;").replace(">", "&gt;");
  }
}
```

`root` and `activeVersions` are bound from `@ConfigurationProperties`
(e.g. `app.prompts.root`, `app.prompts.versions.order-summary=2`).

## Using a loaded prompt

```python
# app/infrastructure/llm_order_summarizer.py
class LlmOrderSummarizer(OrderSummarizer):          # domain port
    def __init__(self, prompts: PromptLoader, client: LlmClient,
                 models: Mapping[str, str]):
        self._prompts = prompts
        self._client = client
        self._models = models

    def summarize(self, customer: Customer, orders: list[Order]) -> Summary:
        template = self._prompts.get("order-summary")
        text = self._client.complete(
            model=self._models[template.params["model"]],
            prompt=template.render({
                "customer_name": customer.display_name,
                "orders_json": orders_to_json(orders),
            }),
            temperature=template.params["temperature"],
            max_tokens=template.params["max_tokens"],
            log_tags={"prompt_id": template.id,
                      "prompt_version": template.version},
        )
        # SEC-10: validate output against a schema, then map to the
        # domain type (the pydantic schema stays in infrastructure).
        return SummarySchema.model_validate_json(text).to_domain()
```
