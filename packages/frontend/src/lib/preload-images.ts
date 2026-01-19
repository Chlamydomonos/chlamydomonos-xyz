export const preloadImages = (...urls: string[]) => {
    return new Promise<void>((resolve, reject) => {
        if (urls.length == 0) {
            resolve();
            return;
        }

        let count = urls.length;

        for (const url of urls) {
            const img = new Image();
            img.onload = () => {
                count--;
                if (count == 0) {
                    resolve();
                }
            };
            img.onerror = reject;
            img.src = url;
        }
    });
};
