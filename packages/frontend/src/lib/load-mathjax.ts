let mathjaxLoaded = false;
let createMathjaxCalled = false;
const waitingResolves: (() => void)[] = [];

const createMathjax = async () => {
    (window as any).MathJax = {
        tex: {
            inlineMath: { '[+]': [['$', '$']] },
        },
        startup: {
            pageReady() {
                return (window as any).MathJax.startup.defaultPageReady().then(() => {
                    console.log('MATHJAX READY');
                    mathjaxLoaded = true;
                    for (const resolve of waitingResolves) {
                        resolve();
                    }
                });
            },
        },
        options: {
            skipStartupTypeset: true,
            compileError(document: any, math: any, error: any) {
                console.log(`Error: "${error.message}" in`, '\n', math.math);
                document.compileError(math, error);
            },
        },
    };

    const script = document.createElement('script');
    script.src = '/mathjax/tex-chtml.js';
    document.head.appendChild(script);
};

export const loadMathjax = () =>
    new Promise<void>((resolve) => {
        if (mathjaxLoaded) {
            resolve();
            return;
        }

        waitingResolves.push(resolve);
        if (!createMathjaxCalled) {
            createMathjax();
            createMathjaxCalled = true;
        }
    });
