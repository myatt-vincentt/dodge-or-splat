/**
 * Every output chunk reachable from `entry` through static `import` statements,
 * in first-reached order, excluding the entry itself. `outputs` is an esbuild
 * metafile's `outputs` map. Dynamic imports are not followed.
 */
export function staticImportClosure(outputs, entry) {
  const seen = new Set([entry]);
  const order = [];
  const queue = [entry];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const imp of outputs[current]?.imports ?? []) {
      if (imp.kind !== "import-statement" || imp.external) continue;
      if (seen.has(imp.path)) continue;
      seen.add(imp.path);
      order.push(imp.path);
      queue.push(imp.path);
    }
  }
  return order;
}
