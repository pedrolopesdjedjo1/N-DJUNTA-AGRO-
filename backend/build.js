// Compila o TypeScript sem verificar tipos (usa pouca memória).
// Gera a pasta dist/ com os mesmos caminhos de src/.
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const SRC = path.join(__dirname, "src");
const OUT = path.join(__dirname, "dist");

const options = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  esModuleInterop: true,
  sourceMap: false,
};

function walk(dir) {
  let files = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) files = files.concat(walk(full));
    else if (full.endsWith(".ts") && !full.endsWith(".d.ts")) files.push(full);
  }
  return files;
}

fs.rmSync(OUT, { recursive: true, force: true });

let count = 0;
for (const file of walk(SRC)) {
  const rel = path.relative(SRC, file).replace(/\.ts$/, ".js");
  const target = path.join(OUT, rel);
  const result = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: options,
    fileName: file,
    reportDiagnostics: false,
  });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, result.outputText);
  count++;
}

if (!fs.existsSync(path.join(OUT, "server.js"))) {
  console.error("ERRO: dist/server.js nao foi criado.");
  process.exit(1);
}
console.log("Build concluido: " + count + " ficheiros em dist/");
