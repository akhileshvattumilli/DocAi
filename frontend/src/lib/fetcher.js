const fetcher = async (url) => {
    const res = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return res.json();
};

export default fetcher;