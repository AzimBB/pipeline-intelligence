import axios from 'axios';

const API_BASE = "/api";

export const getPressurePrediction = async (data: any) => {
    const response = await axios.post(`${API_BASE}/predict`, data);
    return response.data.pressure;
};