import axios from 'axios';

export const blogAxios = axios.create({ baseURL: '/generated/sites/blog' });
