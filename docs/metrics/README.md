# Reproducible source metrics

Run `npm ci`, then `node docs/metrics/generate.mjs --baseline final --target p2`. The generated `report.md` is included in the local submission archive and is deliberately ignored by Git: a report that embeds its own final tag commit cannot also belong to that same commit without circularity. The script, scope and reviewed responsibility map are versioned. No old tag is moved.

Before release use `--target HEAD`; the report marks this as interim. After the final immutable p2 tag exists, regenerate from that tag and include the output. This is a source-history report, not a count of the current working directory.

The CLI counts production TypeScript under src, partitioned into kernel, assembly/adapters and plugins. VSCode production TypeScript is a separate category. Tests, dependencies, generated builds, runtime profiles and fixture code are excluded before category selection. Each physical/nonblank line and syntactic complexity value is computed by the script. Responsibilities are reviewed prose (not hand-entered metrics) loaded from responsibilities.json in the target Git tree. Top-level control decisions are reported separately.

The complexity definition and per-file deltas are printed in the report; it is a syntactic measure, not a proof that a smaller total is better design. The OCP evidence separately measures unchanged existing runtime paths for a real plugin-introduction commit.
