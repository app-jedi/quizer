#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');

function* generatorId() {
	let iter = 0;
	while(true)
		yield ++iter;
}

const questionId = generatorId();
const answerId = generatorId();

const data = [];
const regexTab = /\t/g;

const readerStream = fs.createReadStream('test.txt');
readerStream.setEncoding('UTF8');
const reader = readline.createInterface({
	input: readerStream
});

reader.on('line', line => {
	const result = line.match(regexTab);
	const level = result? result.length + 1 : 1;

	const isQuestion = level % 2 !== 0;
	const id = isQuestion
		? answerId.next().value
		: questionId.next().value;

	data.push({
		value: line.replace(regexTab, ''),
		level,
		id
	});
});

reader.on('close', () => {
	const lastQuestionByLevel = {};
	const questions = {};
	const results = {};

	for (let i = 0; i < data.length; i++) {
		const node = data[i];

		const isFirstNode = i === 0;
		const isLastNode = i === data.length - 1;

		const nextNode = !isLastNode? data[i + 1] : null;
		const prevNode = isFirstNode? data[i - 1] : null;

		const { level, id } = node;
		if (level % 2 !== 0) {
			questions[id] = {
				...node,
				answers: []
			};

			lastQuestionByLevel[level] = id;
		} else {
			let to = null;
			if (!isLastNode && level === nextNode.level - 1)
				to = nextNode.id;

			questions[lastQuestionByLevel[level - 1]].answers.push({
				...node,
				to
			})
		}
	}

	let maxDeep = 0;
	const findDeep = function diving(questions, question, deep) {
		if (maxDeep < deep)
			maxDeep = deep;

		question.deep = deep;
		question.visited = true;
		question.answers.forEach(node => node.to && !questions[node.to].visited
			? diving(questions, questions[node.to], deep + 1)
			: null
		);
	}

	findDeep(questions, questions['1'], 1);

	const result = {};
	for (let key in questions) {
		const question = questions[key];
		const {
			answers,
			value,
			deep,
			id
		} = question;

		result[key] = {
			deeper: maxDeep - 1, // Result test stay in question place
			value,
			deep,
			id
		};

		result[key].answers = answers.map(({ id, value, to }) => ({
			value,
			to,
			id
		}))

		result[key].last = answers.every(({ to }) => questions[to].answers.length === 0);
		result[key].isResult = answers.length === 0;
		if (answers.length === 0)
			results[key] = {
				title: value,
				desc: '',
				cost: '',
				url: ''
			}

	}

	fs.writeFile('./test.json', JSON.stringify(result, null, 4), err => {
		if (err) {
			console.log(err);
			return;
		}
	})

	fs.writeFile('./answers.json', JSON.stringify(results, null, 4), err => {
		if (err) {
			console.log(err);
			return;
		}
	})
});
