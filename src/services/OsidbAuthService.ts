import axios from 'axios';
import {osimRuntime} from '@/stores/osimRuntime';
import {useUserStore} from '../stores/UserStore';
import {z} from 'zod';
import type {AxiosRequestConfig} from 'axios';

const RefreshResponse = z.object({
  access: z.string()
});


export async function osidbFetch(config: AxiosRequestConfig) {
  try {
    const accessToken = await getNextAccessToken();
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${accessToken}`;
    config.baseURL = osimRuntime.value.backends.osidb;
    config.withCredentials = true;
    return axios(config);
  } catch (e) {
    throw e;
  }
}

export async function getNextAccessToken() {
  const userStore = useUserStore(); // Moving this to module scope results in "cannot access before initialization" - probably a vite or typescript bug
  let response;
  try {
    response = await axios({
      method: 'post',
      url: '/auth/token/refresh',
      baseURL: osimRuntime.value.backends.osidb,
      withCredentials: true,
      data: {
        refresh: userStore.refresh,
      },
      // headers: {
      //   'Authorization': `Bearer`
      // },
    });
  } catch (e) {
    return userStore.logout()
        .finally(() => {
          throw new Error('Refresh token expired');
        })
  }
  try {
    const responseBody = response.data;
    const parsedBody = RefreshResponse.parse(responseBody);
    return parsedBody.access;
  } catch (e) {
    return userStore.logout()
        .finally(() => {
          throw new Error('Unable to parse next access token');
        })
  }
}
