const fs = require('fs');

const files = [
  'src/components/MinimalGame.tsx',
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/\(dx \* dx \+ dy \* dy\) <= 5/g, '(dx * dx + dy * dy) <= 25');
    content = content.replace(/\(dx \* dx \+ dy \* dy\) < 5/g, '(dx * dx + dy * dy) < 25');
    content = content.replace(/\(dx \* dx \+ dy \* dy\) > 5/g, '(dx * dx + dy * dy) > 25');
    // MinimalGame doesn't seem to be edited in this PR yet based on my diffs, but the review mentions it. Let's check MinimalGame.
    fs.writeFileSync(file, content);
  }
});
