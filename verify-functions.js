const fetch = globalThis.fetch;
const tests = [
  {
    name: 'Udemy preview JSON',
    url: 'https://mdeaizzwijbnarzqrlbh.supabase.co/functions/v1/udemy-download',
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.udemy.com/course/python-for-beginners/?utm_source=adwords', mode: 'preview' }),
    },
  },
  {
    name: 'YouTube metadata',
    url: 'https://mdeaizzwijbnarzqrlbh.supabase.co/functions/v1/youtube-download',
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', mode: 'video' }),
    },
  },
];
(async () => {
  for (const test of tests) {
    try {
      const res = await fetch(test.url, test.options);
      console.log('TEST', test.name, 'status', res.status);
      const text = await res.text();
      console.log(text.slice(0, 800));
    } catch (e) {
      console.error('FAIL', test.name, e.message);
    }
    console.log('---');
  }
})();
