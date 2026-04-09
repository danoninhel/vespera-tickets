import { ApiResponse } from '../types/index';
import { getEvents } from './events';
import { healthCheck } from './health';

export { getEvents, healthCheck };

export const helloHandler = async (event: unknown = {}): Promise<ApiResponse<{ message: string; input: unknown }>> => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Hello, World!",
            input: event,
        }),
    };
};

export const goodbyeHandler = async (event: unknown = {}): Promise<ApiResponse<{ message: string; input: unknown }>> => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Goodbye!",
            input: event,
        }),
    };
};