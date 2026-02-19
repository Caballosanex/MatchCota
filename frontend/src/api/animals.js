// src/api/animals.js
const API_URL = 'http://localhost:8000/api/v1'; // Ajusta según tu backend

export const createAnimal = async (formData) => {
    const response = await fetch(`${API_URL}/animals`, {
        method: 'POST',
        // No enviamos Content-Type manual porque FormData lo configura solo
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al crear el animal');
    }

    return await response.json();
};