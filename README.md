# @truto/replace-placeholders

Replace placeholders in strings, arrays, and objects easily. This package internally utilizes the [wild-wild-path](https://www.npmjs.com/package/wild-wild-path) library and supports all path formats provided by it.

## Installation

```bash
npm install @truto/replace-placeholders
```

## Usage

### Basic

```javascript
import replacePlaceholders from '@truto/replace-placeholders';

const result = replacePlaceholders('Foo: {{foo}}', { foo: 'bar' });
console.log(result);  // Outputs: 'Foo: bar'
```

### Advanced Usage with Different Data Types

#### Strings

```javascript
console.log(replacePlaceholders('{{foo}}', { foo: 'bar' }));  // Outputs: 'bar'
console.log(replacePlaceholders('{{foo-bar.something}}', { 'foo-bar': { something: true } }));  // Outputs: 'true'
console.log(replacePlaceholders('{{foo}} {{bar:bool}}', { foo: 'bar', bar: 'false' }));  // Outputs: 'bar false'
console.log(replacePlaceholders('{{foo.0.bar}}', { foo: [{ bar: 'baz' }] }));  // Outputs: 'baz'
```

#### Arrays

```javascript
console.log(replacePlaceholders(['Foo: {{foo}}'], { foo: 'bar' }));  // Outputs: ['Foo: bar']
console.log(replacePlaceholders(['{{foo}}', '{{bar:num}}'], { foo: 'bar', bar: '1.34' }));  // Outputs: ['bar', 1.34]
```

#### Objects

```javascript
console.log(replacePlaceholders({ foo: '{{foo}}' }, { foo: 'bar' }));  // Outputs: { foo: 'bar' }
console.log(replacePlaceholders({ foo: '{{foo}}', bar: '{{bar:int}}' }, { foo: 'bar', bar: 1 }));  // Outputs: { foo: 'bar', bar: 1 }
```

### Conversion Types

You can coerce values to specific types. 

**Only works when the placeholder is the complete string.**

```javascript
console.log(replacePlaceholders('{{foo:int}}', { foo: '1' }));  // Outputs: 1
console.log(replacePlaceholders('{{foo:num}}', { foo: '1.1' }));  // Outputs: 1.1
console.log(replacePlaceholders('{{foo:bool}}', { foo: 'true' }));  // Outputs: true
console.log(replacePlaceholders('{{foo:json}}', { foo: '{"foo":"bar"}' }));  // Outputs: { foo: 'bar' }
console.log(replacePlaceholders('{{foo:json}}', { foo: { foo: 'bar' } }));  // Outputs: { foo: 'bar' }
console.log(replacePlaceholders('{{foo:null}}', { foo: 'null' }));  // Outputs: null
```

### Remove empty placeholders

You can use `undefined` keyword to remove placeholders that are not found in the data object.

```javascript
console.log(replacePlaceholders('foo {{foo:undefined}} {{bar}}', { bar: 'bar' }));  // Outputs: 'foo  bar'
```

### Ignoring empty strings

You can use `ignore-empty-str` keyword to ignore empty strings in the output. Useful when used with conditional replacements below.

```javascript
console.log(replacePlaceholders('foo {{foo:ignore-empty-str}} {{bar}}', { foo: '', bar: 'bar' })) // Outputs: 'foo {{foo:ignore-empty-str}} bar'
console.lo(replacePlaceholders('{{foo|bar:ignore-empty-str}}', { foo: '', bar: 'bar' })) // Outputs: 'bar'
```

### Conditional Replacements (Fallback Values)

Using a `|` (pipe) character, you can provide fallback values right within the placeholder. The function will pick the first non-`undefined` value for the replacement.

```javascript
console.log(replacePlaceholders('{{foo|bar}}', { foo: 'foo', bar: 'bar' }));  // Outputs: 'foo'
console.log(replacePlaceholders('{{foo:str|bar:int}}', { bar: 1 }));  // Outputs: 1
console.log(replacePlaceholders('{{foo.bar:str|bar:str}}', { foo: { bar: 'bar' } }));  // Outputs: 'bar'
console.log(replacePlaceholders('{{foo.bar|bar:str}}', { foo: { bar: true } }));  // Outputs: 'true'
```

### Default values

Using the Elvis operator `?:`, you can provide default values for placeholders that are not found in the data object.

```javascript
console.log(replacePlaceholders('{{foo?:bar}}', { bar: 'bar' }));  // Outputs: 'bar'
````

You can also combine it with type casting

```javascript
console.log(replacePlaceholders('{{foo?:1:int}}', { foo: '1' }));  // Outputs: 1
````

## License

This project is licensed under the MIT License.

```
MIT License

Copyright (c) 2023 Yin Yang Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Contributing

We welcome contributions from the community! If you wish to contribute, please follow these steps:

1. **Fork the repository**: Click on the 'Fork' button at the top right of this page and clone your forked repository to your local machine.

2. **Create a new branch**: Create a new branch named after the feature or fix you are working on. For example: `feature/new-placeholder-syntax` or `fix/issue-123`.

3. **Make your changes**: Make the necessary modifications to the code. Ensure that you adhere to the existing coding standards and conventions.

4. **Commit your changes**: Commit your changes with a clear and concise commit message that describes the changes you made.

5. **Push to your fork**: Push your changes to your forked repository on GitHub.

6. **Submit a pull request**: Create a new pull request from your forked repository to the main repository. Please ensure that your pull request describes the changes you made, references any related issues, and has been tested on the latest version of the package.

Please note: By contributing to this project, you agree to abide by the code of conduct and that your contributions will be licensed under the MIT license (as per the LICENSE section).
