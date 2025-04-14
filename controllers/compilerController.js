import axios from 'axios';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY; // You'll need to add this to your .env file

// Validate Java code structure
const validateJavaCode = (code) => {
    // Check if code contains a Main class
    if (!code.includes('public class Main')) {
        return {
            isValid: false,
            error: 'Code must contain a public class named "Main"'
        };
    }

    // Check if code contains main method
    if (!code.includes('public static void main(String[] args)')) {
        return {
            isValid: false,
            error: 'Code must contain a public static void main method'
        };
    }

    return { isValid: true };
};

// Analyze code and create visualization steps
const createVisualizationSteps = (code) => {
    const steps = [];
    const lines = code.split('\n');
    let currentVariables = {};
    let currentLine = 0;

    // Helper function to add a step
    const addStep = (description, variables = {}, dataStructure = null) => {
        steps.push({
            line: currentLine + 1,
            description,
            variables: { ...currentVariables, ...variables },
            dataStructure
        });
    };

    // Process each line
    while (currentLine < lines.length) {
        const line = lines[currentLine].trim();
        
        // Skip empty lines and comments
        if (!line || line.startsWith('//')) {
            currentLine++;
            continue;
        }

        try {
            // Handle variable declarations
            const varDeclMatch = line.match(/^(int|double|String|boolean|char)\s+(\w+)\s*=\s*(.+);/);
            if (varDeclMatch) {
                const [_, type, name, value] = varDeclMatch;
                currentVariables[name] = value.trim();
                addStep(`Declaring ${type} variable '${name}' with value ${value.trim()}`);
            }
            // Handle variable assignments
            else if (line.match(/^\w+\s*=/)) {
                const [name, ...rest] = line.split(/\s+/);
                const value = rest.join(' ').replace('=', '').trim().replace(';', '');
                currentVariables[name] = value;
                addStep(`Assigning value ${value} to variable '${name}'`);
            }
            // Handle System.out.println
            else if (line.includes('System.out.println')) {
                const printMatch = line.match(/System\.out\.println\((.*)\)/);
                if (printMatch) {
                    const content = printMatch[1];
                    addStep(`Printing: ${content}`, currentVariables);
                }
            }
            // Handle for loops
            else if (line.includes('for(')) {
                const forMatch = line.match(/for\s*\(\s*(\w+)\s*=\s*(\d+)/);
                if (forMatch) {
                    const [_, loopVar, startValue] = forMatch;
                    currentVariables[loopVar] = startValue;
                    addStep(`Starting for loop with ${loopVar} = ${startValue}`, currentVariables);
                }
            }
            // Handle while loops
            else if (line.includes('while(')) {
                const whileMatch = line.match(/while\s*\((.*)\)/);
                if (whileMatch) {
                    const condition = whileMatch[1];
                    addStep(`Starting while loop with condition: ${condition}`, currentVariables);
                }
            }
            // Handle if statements
            else if (line.includes('if(')) {
                const ifMatch = line.match(/if\s*\((.*)\)/);
                if (ifMatch) {
                    const condition = ifMatch[1];
                    addStep(`Evaluating if condition: ${condition}`, currentVariables);
                }
            }
            // Handle method calls
            else if (line.match(/^\w+\(.*\)/)) {
                const methodMatch = line.match(/^(\w+)/);
                if (methodMatch) {
                    const methodName = methodMatch[1];
                    addStep(`Calling method: ${methodName}`, currentVariables);
                }
            }
            // Handle class and method declarations
            else if (line.includes('class') || line.includes('public static void main')) {
                addStep(`Declaring ${line.trim()}`, currentVariables);
            }
        } catch (err) {
            console.error(`Error processing line ${currentLine + 1}:`, err);
            addStep(`Processing line: ${line}`, currentVariables);
        }

        currentLine++;
    }

    return steps;
};

// Analyze code for edge cases
const analyzeEdgeCases = (code) => {
    const edgeCases = [];
    const lines = code.split('\n');

    // Check for potential null pointer exceptions
    if (code.includes('String') && code.includes('null')) {
        edgeCases.push({
            type: 'NullPointerException',
            severity: 'high',
            description: 'Potential null pointer exception in String operations',
            line: lines.findIndex(line => line.includes('String') && line.includes('null')) + 1,
            suggestion: 'Add null checks before performing String operations'
        });
    }

    // Check for array index out of bounds
    if (code.includes('[') && code.includes(']')) {
        edgeCases.push({
            type: 'ArrayIndexOutOfBoundsException',
            severity: 'high',
            description: 'Potential array index out of bounds error',
            line: lines.findIndex(line => line.includes('[') && line.includes(']')) + 1,
            suggestion: 'Add bounds checking before accessing array elements'
        });
    }

    // Check for division by zero
    if (code.includes('/')) {
        edgeCases.push({
            type: 'ArithmeticException',
            severity: 'high',
            description: 'Potential division by zero error',
            line: lines.findIndex(line => line.includes('/')) + 1,
            suggestion: 'Add checks to prevent division by zero'
        });
    }

    // Check for infinite loops
    if (code.includes('while(true)') || code.includes('for(;;)')) {
        edgeCases.push({
            type: 'InfiniteLoop',
            severity: 'medium',
            description: 'Potential infinite loop detected',
            line: lines.findIndex(line => line.includes('while(true)') || line.includes('for(;;)')) + 1,
            suggestion: 'Add proper loop termination conditions'
        });
    }

    // Check for memory issues with large data structures
    if (code.includes('ArrayList') || code.includes('LinkedList')) {
        edgeCases.push({
            type: 'MemoryUsage',
            severity: 'medium',
            description: 'Potential memory issues with large data structures',
            line: lines.findIndex(line => line.includes('ArrayList') || line.includes('LinkedList')) + 1,
            suggestion: 'Consider using appropriate data structure size limits'
        });
    }

    // Check for potential overflow in numeric operations
    if (code.includes('int') && (code.includes('+') || code.includes('*'))) {
        edgeCases.push({
            type: 'IntegerOverflow',
            severity: 'medium',
            description: 'Potential integer overflow in arithmetic operations',
            line: lines.findIndex(line => line.includes('int') && (line.includes('+') || line.includes('*'))) + 1,
            suggestion: 'Consider using long for large numbers or add overflow checks'
        });
    }

    // Check for potential race conditions
    if (code.includes('Thread') || code.includes('synchronized')) {
        edgeCases.push({
            type: 'Concurrency',
            severity: 'high',
            description: 'Potential race condition in concurrent code',
            line: lines.findIndex(line => line.includes('Thread') || line.includes('synchronized')) + 1,
            suggestion: 'Ensure proper synchronization and thread safety'
        });
    }

    return edgeCases;
};

export const compileAndRun = async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'No code provided'
            });
        }

        // Validate Java code structure
        const validation = validateJavaCode(code);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        // Save the code to a temporary file
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
        const filePath = path.join(tempDir, 'Main.java');
        fs.writeFileSync(filePath, code);

        // Compile the Java code
        exec(`javac ${filePath}`, (compileError, stdout, stderr) => {
            if (compileError) {
                return res.status(400).json({
                    success: false,
                    message: 'Compilation error',
                    error: stderr
                });
            }

            // Run the compiled Java program
            exec(`java -cp ${tempDir} Main`, (runError, runStdout, runStderr) => {
                if (runError) {
                    return res.status(400).json({
                        success: false,
                        message: 'Runtime error',
                        error: runStderr
                    });
                }

                return res.json({
                    success: true,
                    output: runStdout
                });
            });
        });
    } catch (error) {
        console.error('Compiler error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

export const visualizeCode = async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'No code provided'
            });
        }

        // Validate Java code structure
        const validation = validateJavaCode(code);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        // Create visualization steps
        const steps = createVisualizationSteps(code);

        return res.json({
            success: true,
            visualization: {
                steps,
                totalSteps: steps.length,
                currentStep: 0
            }
        });
    } catch (error) {
        console.error('Visualization error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

export const getEdgeCases = async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'No code provided'
            });
        }

        // Validate Java code structure
        const validation = validateJavaCode(code);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        // Analyze edge cases
        const edgeCases = analyzeEdgeCases(code);

        return res.json({
            success: true,
            edgeCases,
            totalCases: edgeCases.length
        });

    } catch (error) {
        console.error('Edge case analysis error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};