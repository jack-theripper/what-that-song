import {API_BASE} from "../constatnts";
import {TMusic} from "../types";

type FailureResponse = { success: false; message: string };
type FetchResultsResponse = { success: boolean; payload: TMusic[]; }

export default class RecognizeService {

    /**
     * Сделать запрос к бэкенду и передать данные для определения.
     *
     * @param buffer
     * @param numberOfChannels
     * @param sampleRate
     */
    static async fetchResults(buffer: BlobPart[], numberOfChannels: number, sampleRate: number) {

        const body = new FormData();

        body.append('file', new Blob(buffer), 'ly');
        body.append('channels', `${numberOfChannels}`);
        body.append('sampleRate', `${sampleRate}`);

        return await this.api<FetchResultsResponse>(`${API_BASE}/recognize`, {method: 'POST', body});
    }

    /**
     * Обертка над `success` и `json()` плюс типизация.
     *
     * @param url
     * @param options
     */
    static api<T>(url: string, options?: RequestInit): Promise<T> {
        return fetch(url, options)
            .then(response => {
                if (!response.ok) {
                    throw new Error(response.statusText)
                }

                return response.json() as Promise<T & FailureResponse>
            })
            .then(response => {
                if (!response.success) {
                    throw new Error(response.message || 'Unknown error')
                }

                return response;
            })
    }

}