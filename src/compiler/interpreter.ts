import type { Compilation } from "./bytecode";
import * as bc from "./bytecode";

class RuntimeError extends Error {
    name = "RuntimeError";
}
type RuntimeValue =
    | RuntimeFunction
    | RuntimeNumber
    | RuntimeString
    | RuntimeNull
    | RuntimeBoolean;

type RuntimeFunction = {
    type: "func";
    value: (...args: RuntimeValue[]) => RuntimeValue;
};
type RuntimeString = {
    type: "string";
    value: string;
};
type RuntimeNumber = {
    type: "number";
    value: number;
};
type RuntimeBoolean = {
    type: "boolean";
    value: boolean;
};
type RuntimeNull = {
    type: "null";
    value: null;
};

export function execute(compilation: Compilation, input: string): string {
    const { names } = compilation;
    const program = compilation.bytecode;

    let output = "";
    let pc = 0;
    let stack: RuntimeValue[] = [];

    const literals: RuntimeValue[] = compilation.literals.map(toRuntimeValue);

    const std: Record<string, RuntimeValue> = {
        null: { type: "null", value: null },
        true: { type: "boolean", value: true },
        false: { type: "boolean", value: false },
        stdin: { type: "string", value: input },
        print: {
            type: "func",
            value: (...args: any[]) => {
                for (const arg of args) {
                    output += String(arg.value);
                    output += " ";
                }
                output += "\n";
                return toRuntimeValue(null);
            },
        },
        str: {
            type: "func",
            value: (...args: RuntimeValue[]) => {
                if (args.length !== 1)
                    throw new RuntimeError("string expects 1 argument");

                let arg = args[0];

                if (arg.type === "string") {
                    return arg;
                } else if (arg.type === "number") {
                    return toRuntimeValue(arg.value.toFixed());
                } else if (arg.type === "null") {
                    return toRuntimeValue("null");
                } else if (arg.type === "boolean") {
                    return toRuntimeValue(String(arg.value));
                } else if (arg.type === "func") {
                    return toRuntimeValue("[function]");
                } else {
                    return toRuntimeValue("");
                }
            },
        },
        int: {
            type: "func",
            value: (...args: RuntimeValue[]) => {
                if (args.length !== 1)
                    throw new RuntimeError("int expects 1 argument");

                let arg = args[0];
                if (arg.type === "number") return arg;
                if (arg.type !== "string")
                    throw new RuntimeError(
                        `unspported type in int(): ${arg.type}`,
                    );

                let value = Number(arg.value);
                if (isNaN(value))
                    throw new RuntimeError(
                        `Could not convert "${arg.value}" to int`,
                    );

                return toRuntimeValue(value);
            },
        },
        round: {
            type: "func",
            value: (...args: RuntimeValue[]) => {
                if (args.length !== 1)
                    throw new RuntimeError("int expects 1 argument");
                let arg = args[0];

                if (arg.type !== "number")
                    throw new RuntimeError(`expected intto round()`);

                return toRuntimeValue(Math.floor(arg.value));
            },
        },
    };

    const variables: (RuntimeValue | undefined)[] = names.map(v => {
        if (v in std) return std[v];
        return undefined;
    });

    const stackPop = () => {
        if (stack.length > 0) return stack.pop()!;
        throw new Error("Compiler Error: Stack empty");
    };

    const pushNumber = (value: number) => stack.push({ type: "number", value });
    const pushString = (value: string) => stack.push({ type: "string", value });
    const pushBoolean = (value: boolean) =>
        stack.push({ type: "boolean", value });
    const pushValue = (value: RuntimeValue) => stack.push(value);

    const binop = () => {
        const op = program[pc++];
        const right = stackPop();
        const left = stackPop();

        const type = right.type;
        if (left.type === "string" && right.type === "string") {
            if (op === bc.OP_PLUS)
                pushString(left.value + right.value); //
            else if (op === bc.OP_EQUALS)
                pushBoolean(left.value === right.value); //
            else if (op === bc.OP_NOT_EQUALS)
                pushBoolean(left.value !== right.value); //
            else {
                const symbol = bc.binopSymbols[op];
                throw new RuntimeError(
                    `tried to perform ${symbol} on a ${type}`,
                );
            }
        } else if (left.type === "boolean" && right.type === "boolean") {
            if (op === bc.OP_EQUALS)
                pushBoolean(left.value === right.value); //
            else if (op === bc.OP_NOT_EQUALS)
                pushBoolean(left.value !== right.value); //
            else {
                const symbol = bc.binopSymbols[op];
                throw new RuntimeError(
                    `tried to perform ${symbol} on a ${type}`,
                );
            }
        } else if (left.type === "null" && right.type === "null") {
            if (op === bc.OP_EQUALS)
                pushBoolean(left.value === right.value); //
            else if (op === bc.OP_NOT_EQUALS)
                pushBoolean(left.value !== right.value); //
            else {
                const symbol = bc.binopSymbols[op];
                throw new RuntimeError(
                    `tried to perform ${symbol} on a ${type}`,
                );
            }
        } else if (left.type === "number" && right.type === "number") {
            if (op === bc.OP_PLUS)
                pushNumber(left.value + right.value); //
            else if (op === bc.OP_MINUS)
                pushNumber(left.value - right.value); //
            else if (op === bc.OP_DIVIDE)
                pushNumber(left.value / right.value); //
            else if (op === bc.OP_MULTIPLY)
                pushNumber(left.value * right.value); //
            else if (op === bc.OP_EXPONENT)
                pushNumber(left.value ** right.value); //
            else if (op === bc.OP_EQUALS)
                pushBoolean(left.value === right.value);
            else if (op === bc.OP_NOT_EQUALS)
                pushBoolean(left.value !== right.value);
            else if (op === bc.OP_GREATER_THAN)
                pushBoolean(left.value > right.value);
            else if (op === bc.OP_GREATER_THAN_OR_EQ)
                pushBoolean(left.value >= right.value);
            else if (op === bc.OP_LESS_THAN)
                pushBoolean(left.value < right.value);
            else if (op === bc.OP_LESS_THAN_OR_EQ)
                pushBoolean(left.value <= right.value);
            else {
                const symbol = bc.binopSymbols[op];
                throw new RuntimeError(
                    `tried to perform ${symbol} on a "${type}"`,
                );
            }
        } else {
            const symbol = bc.binopSymbols[op];
            throw new RuntimeError(
                `unsupported operation "${left.type}" ${symbol} "${right.type}"`,
            );
        }
    };

    const call = () => {
        const argCount = program[pc++];
        const args = [];
        for (let i = 0; i < argCount; i++) {
            args.push(stackPop());
        }
        args.reverse();
        const func = stackPop();
        if (func.type !== "func")
            throw new RuntimeError(`Attempted to call with "${func.type}"`);
        const result = func.value(...args);
        pushValue(result);
    };

    const getLiteral = () => {
        const index = program[pc++];
        stack.push(literals[index]);
    };
    const unaryPlus = () => {
        const value = stackPop();
        if (value.type !== "number")
            throw new RuntimeError(
                `Attempted to perform unary plus on "${value.type}"`,
            );
        pushNumber(+value.value);
    };
    const unaryMinus = () => {
        const value = stackPop();
        if (value.type !== "number")
            throw new RuntimeError(
                `Attempted to perform unary minus on "${value.type}"`,
            );
        pushNumber(-value.value);
    };
    const unaryNot = () => {
        const value = stackPop();
        if (value.type !== "boolean")
            throw new RuntimeError(
                `Attempted to perform unary not on "${value.type}"`,
            );
        pushBoolean(!value.value);
    };

    const getName = () => {
        const index = program[pc++];
        let value = variables[index];
        if (!value) {
            throw new RuntimeError(
                `Attempted to access variable "${names[index]}" before it was defined`,
            );
        }
        stack.push(value);
    };

    const jumpForward = () => {
        const distance = program[pc++];
        pc += distance;
    };
    const jumpBackward = () => {
        const distance = program[pc++];
        pc -= distance;
    };

    const jumpIfNot = () => {
        const distance = program[pc++];
        const condition = stackPop();
        if (condition.type !== "boolean") {
            throw new RuntimeError(
                `If condition was of type ${condition.type}`,
            );
        }

        if (!condition.value) {
            pc += distance;
        }
    };

    const storeName = () => {
        const index = program[pc++];
        variables[index] = stackPop();
    };

    const toBool = () => {
        const value = stackPop();
        pushBoolean(!!value.value);
    };

    const nextOpcode = () => {
        const byte = program[pc++];

        if (byte === bc.DISCARD) return stackPop();
        if (byte === bc.UNARY_NOT) return unaryNot();
        if (byte === bc.UNARY_PLUS) return unaryMinus();
        if (byte === bc.UNARY_MINUS) return unaryPlus();
        if (byte === bc.BINARY_OP) return binop();
        if (byte === bc.CALL) return call();
        if (byte === bc.JUMP_FORWARD) return jumpForward();
        if (byte === bc.JUMP_BACKWARD) return jumpBackward();
        if (byte === bc.JUMP_IF_NOT) return jumpIfNot();
        if (byte === bc.GET_NAME) return getName();
        if (byte === bc.STORE_NAME) return storeName();
        if (byte === bc.GET_LITERAL) return getLiteral();
        if (byte === bc.TO_BOOL) return toBool();
        throw new Error(`Compiler Error: Unknown opcode ${byte}`);
    };

    let i = 0;
    let start = performance.now();
    while (pc < program.length) {
        if (i++ % 1000 === 0) {
            const duration = performance.now() - start;
            if (duration > 25) {
                output += "Timeout Error\n";
                break;
            }
        }

        nextOpcode();
    }

    return output;
}

const toRuntimeValue = (value: any): RuntimeValue => {
    if (typeof value === "string") return { type: "string", value };
    if (typeof value === "number") return { type: "number", value };
    if (typeof value === "function") return { type: "func", value };
    if (typeof value === "boolean") return { type: "boolean", value };
    if (value === null) return { type: "null", value: null };
    throw new Error(`Unsupported type: ${typeof value}`);
};
