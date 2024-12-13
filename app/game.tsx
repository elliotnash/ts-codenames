// import { createServerFn } from '@tanstack/start';

// const getGameWords = createServerFn().handler(async () => {
//   if (!words) {
//     const wordString = await fs.readFile('words.txt', 'utf-8');
//     const wordsArr = wordString
//       .replaceAll('\n', ',')
//       .split(',')
//       .map((word) => word.trim())
//       .filter((word) => word.length > 0);

//     const shuffled = wordsArr.sort(() => 0.5 - Math.random());

//     words = shuffled.slice(0, 25);
//   }
//   return words;
// });

// type Category = 'blue' | 'red' | 'bystander' | 'death';

// let categories: Category[] | undefined;

// const getGameCategories = createServerFn().handler(async () => {
//   if (!categories) {
//     const gameWords = await getGameWords();
//     const shuffled = gameWords.slice().sort(() => 0.5 - Math.random());

//     const death = shuffled[0]!;
//     const teamA = shuffled.slice(1, 9);
//     const teamB = shuffled.slice(9, 18);

//     const newCategories: Category[] = Array(25).fill('bystander');

//     const deathIndex = gameWords.indexOf(death);
//     newCategories[deathIndex] = 'death';

//     for (const word of teamA) {
//       const index = gameWords.indexOf(word);
//       newCategories[index] = 'blue';
//     }

//     for (const word of teamB) {
//       const index = gameWords.indexOf(word);
//       newCategories[index] = 'red';
//     }

//     categories = newCategories;
//   }
//   return categories;
// });
