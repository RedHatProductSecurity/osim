import tscomplex from 'ts-complex';

const path = './src/services/FlawService.ts'; // Finding maintainability of this file
const maintainability = tscomplex.calculateMaintainability(path);
console.log(maintainability); // { averageMaintainability: 56.14, minMaintainability: 46.19 }

const halstead = tscomplex.calculateHalstead(path);
console.log(halstead); // object with function name as keys and Halstead Complexity Matrices as value


const complexity = tscomplex.calculateCyclomaticComplexity(path);
console.log(complexity); // object with function name as keys and cyclomatic complexity as value
