// Sample content used by seed.js. Each lesson's position in its list becomes its order.
// Thumbnails come from picsum.photos, a free placeholder image service.
module.exports = [
  {
    title: 'Web Development Basics',
    description:
      'Build your first web pages from scratch. Learn how the web works, structure content with HTML, and style it with CSS.',
    category: 'Web Development',
    level: 'beginner',
    thumbnailUrl: 'https://picsum.photos/seed/web-basics/640/360',
    isPublished: true,
    lessons: [
      {
        title: 'How the web works',
        content: `When you visit a website, your **browser** asks another computer, called a **server**, for a page. The server replies, and the browser displays the result.

## The three languages of the web

- **HTML** gives a page its structure
- **CSS** controls how it looks
- **JavaScript** makes it interactive

> Tip: right-click any page and choose *Inspect* to see the code behind it.`,
        // Big Buck Bunny, an open-licence film, stands in for a real lesson video.
        videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
      },
      {
        title: 'Your first HTML page',
        content: `Create a file called \`index.html\` and add this:

\`\`\`html
<!doctype html>
<html>
  <head>
    <title>My first page</title>
  </head>
  <body>
    <h1>Hello, world!</h1>
    <p>I built this myself.</p>
  </body>
</html>
\`\`\`

Open the file in your browser to see it.

## Key idea

Tags come in pairs. \`<p>\` opens a paragraph and \`</p>\` closes it.`,
      },
      {
        title: 'Styling with CSS',
        content: `CSS rules have two parts: a **selector** that picks elements, and **declarations** that style them.

\`\`\`css
h1 {
  color: teal;
  font-size: 2rem;
}
\`\`\`

## Try it

1. Add a \`<style>\` tag inside your page's \`<head>\`
2. Paste in the rule above
3. Refresh the browser`,
      },
      {
        title: 'Page layout with flexbox',
        content: `Flexbox lines up items in a row or column, and shares the space between them.

\`\`\`css
.row {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}
\`\`\`

Every direct child of \`.row\` now sits side by side. Experiment with \`justify-content: center\` to see the difference.`,
      },
    ],
  },
  {
    title: 'JavaScript Essentials',
    description:
      'Learn the programming language of the web: variables, functions, arrays, and how to respond when users click.',
    category: 'Web Development',
    level: 'intermediate',
    thumbnailUrl: 'https://picsum.photos/seed/js-essentials/640/360',
    isPublished: true,
    lessons: [
      {
        title: 'Variables and types',
        content: `Use \`const\` for values that won't be reassigned, and \`let\` for values that will.

\`\`\`js
const name = 'Sam';
let score = 0;
score = score + 10;
\`\`\``,
      },
      {
        title: 'Functions',
        content: `A function is a reusable, named block of code.

\`\`\`js
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('Sam')); // Hello, Sam!
\`\`\``,
      },
      {
        title: 'Working with arrays',
        content: `Arrays hold ordered lists of values, and include helpful methods.

\`\`\`js
const scores = [70, 85, 92];
const passed = scores.filter((score) => score >= 80);
console.log(passed); // [85, 92]
\`\`\``,
      },
    ],
  },
  {
    title: 'Design Fundamentals',
    description:
      'See what makes a layout feel right. Learn contrast, hierarchy, and spacing, and apply them to your own work.',
    category: 'Design',
    level: 'beginner',
    thumbnailUrl: 'https://picsum.photos/seed/design-fundamentals/640/360',
    isPublished: true,
    lessons: [
      {
        title: 'Visual hierarchy',
        content: `Hierarchy tells the reader what to look at first. You can create it with:

- **Size**: bigger things read first
- **Weight**: bold stands out from regular text
- **Space**: isolated items attract attention`,
      },
      {
        title: 'Colour and contrast',
        content: `Readable text needs enough contrast with its background. The usual target for body text is a ratio of at least **4.5:1**.

Limit yourself to one accent colour, and save it for what matters most.`,
      },
    ],
  },
  {
    title: 'Data Analysis with Spreadsheets',
    description:
      'Turn rows of numbers into answers using formulas, sorting, and pivot tables, with no programming required.',
    category: 'Data',
    level: 'beginner',
    thumbnailUrl: 'https://picsum.photos/seed/spreadsheets/640/360',
    isPublished: true,
    lessons: [
      {
        title: 'Formulas that matter',
        content: `Most analysis starts with just a few functions:

| Formula | What it does |
| --- | --- |
| \`SUM\` | Adds numbers together |
| \`AVERAGE\` | Finds the mean |
| \`COUNTIF\` | Counts the rows that match a condition |`,
      },
      {
        title: 'Pivot tables',
        content: `A pivot table summarises a large table without any formulas.

1. Select your data
2. Insert a pivot table
3. Drag a category into **Rows** and a number into **Values**`,
      },
    ],
  },
  {
    // A draft: instructors see it on their dashboard, but it's hidden from the catalogue.
    title: 'Advanced React Patterns (Draft)',
    description: 'Custom hooks, context, and performance techniques for larger React applications.',
    category: 'Web Development',
    level: 'advanced',
    thumbnailUrl: 'https://picsum.photos/seed/react-patterns/640/360',
    isPublished: false,
    lessons: [
      {
        title: 'Writing custom hooks',
        content: `A custom hook is a function whose name starts with \`use\`, and which calls other hooks. It lets several components share stateful logic.`,
      },
    ],
  },
];
