const fs = require('fs');
const path = require('path');

// Read Icon.js to extract all keys in ICON_MAP
const iconJsContent = fs.readFileSync(path.join(__dirname, 'src/components/ui/Icon.js'), 'utf8');
const iconNames = new Set();
const keyMatches = iconJsContent.matchAll(/['"]([a-z0-9]+(?:-[a-z0-9]+)*)['"]\s*:/g);
for (const km of keyMatches) {
  iconNames.add(km[1]);
}

const HYPHENATED_ICON_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)+$/;

let errorsFound = [];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    // Check 1: <Text...>{'icon-name'}</Text> or <Text...>"icon-name"</Text>
    const literalMatches = line.matchAll(/<Text[^>]*>\s*['"]([^'"]+)['"]\s*<\/Text>/g);
    for (const match of literalMatches) {
      const textVal = match[1].trim();
      if (iconNames.has(textVal) || (HYPHENATED_ICON_REGEX.test(textVal) && !textVal.includes(' '))) {
        errorsFound.push({
          file: filePath,
          line: lineNum,
          issue: `Found icon name "${textVal}" rendered directly as Text literal`,
          source: trimmed,
        });
      }
    }

    // Check 2: <Text...>icon-name</Text> (bare text inside Text tag)
    const bareMatches = line.matchAll(/<Text[^>]*>([^<>{}\n]+)<\/Text>/g);
    for (const match of bareMatches) {
      const textVal = match[1].trim();
      if (iconNames.has(textVal)) {
        errorsFound.push({
          file: filePath,
          line: lineNum,
          issue: `Found icon name "${textVal}" rendered bare inside <Text>`,
          source: trimmed,
        });
      }
    }

    // Check 3: Raw icon identifier rendered as a React child without <Icon>
    // e.g. <Text>{icon}</Text> or <View>{icon}</View> without React.isValidElement guard
    if (/<Text[^>]*>\s*\{\s*icon\s*\}\s*<\/Text>/g.test(line)) {
      errorsFound.push({
        file: filePath,
        line: lineNum,
        issue: `Found <Text>{icon}</Text> which renders icon name string as visible text!`,
        source: trimmed,
      });
    }

    // Check 4: Check if any <Text> has a known icon name as its only child expression
    for (const name of ['sparkles', 'checkmark-circle', 'trash', 'flame', 'close']) {
      const regex = new RegExp(`<Text[^>]*>[^<]*['"]${name}['"][^<]*<\\/Text>`, 'g');
      if (regex.test(line)) {
        errorsFound.push({
          file: filePath,
          line: lineNum,
          issue: `Detected icon "${name}" inside <Text> element`,
          source: trimmed,
        });
      }
    }
  });
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      if (entry !== 'node_modules' && entry !== '.git' && entry !== 'dist') {
        walk(fullPath);
      }
    } else if (entry.endsWith('.js') || entry.endsWith('.jsx')) {
      if (!entry.includes('verify-icon-guard') && !entry.includes('scan-icons')) {
        checkFile(fullPath);
      }
    }
  }
}

console.log(`=== RUNNING ICON GUARD SCAN (Monitoring ${iconNames.size} icon names) ===`);
walk(path.join(__dirname, 'src'));

if (errorsFound.length > 0) {
  console.error(`\n❌ ICON GUARD FAILED! Found ${errorsFound.length} issues:`);
  errorsFound.forEach(err => {
    console.error(`  - ${path.relative(__dirname, err.file)}:${err.line}`);
    console.error(`    ${err.issue}`);
    console.error(`    Code: ${err.source}\n`);
  });
  process.exit(1);
} else {
  console.log(`\n✅ ICON GUARD PASSED: 0 icon names rendered as text across all screens and components!`);
}
