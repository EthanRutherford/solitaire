import {list as dbList, add, logsTable, limit} from "../logic/game-db";

export enum LogLevel {
	Log,
	Warn,
	Error,
}

export interface LogValue {
	msg: string;
	[x: string]: unknown;
}

export async function log(value: LogValue, level: LogLevel = LogLevel.Log) {
	const entry = {
		...value,
		level: LogLevel[level],
		time: Date.now(),
	};

	await add(logsTable, entry);
	await limit(logsTable, 2 ** 16);
}

export async function warn(value: LogValue) {
	return log(value, LogLevel.Warn);
}

export async function error(value: LogValue) {
	return log(value, LogLevel.Error);
}

export async function list() {
	return dbList(logsTable);
}
