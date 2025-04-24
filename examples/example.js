'use strict';
import { createInstance } from '../dist/index.js';

const api = createInstance({
  baseUrl: 'https://jsonplaceholder.typicode.com',
});

const button = document.querySelector('#btn');

button.addEventListener('click', async () => {
  console.log('Button clicked!');

  try {
    const result = await api.post('/posts', {
      body: {
        title: 'New Post',
        body: 'This is the content',
        userId: 1,
      },
    });
    if (result?.data) {
      console.log('Created post:', result.data);
    }
  } catch (error) {
    console.error(error);
  }
});
