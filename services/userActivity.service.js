const UserActivity = require('../models/userActivity.model');

// Método para registrar una nueva actividad de usuario
exports.logUserActivity = async function (data) {
    try {

        console.log('Datos a guardar en la base de datos:', data); // Verifica qué datos se están enviando

        const newActivity = new UserActivity(data);
        await newActivity.save();
        console.log('SERVICIO: Actividad de usuario registrada correctamente');
    } catch (error) {
        console.error('SERVICIO: Error al registrar la actividad de usuario:', error);
    }
}

// Obtiene actividades de usuario con filtros opcionales para evitar cargar todo el historial.
// options: { days?: number, startDate?: Date|string, endDate?: Date|string }
// - days: solo actividades de los últimos N días (ej. 30). Consulta eficiente por timestamp.
// - startDate + endDate: rango de fechas para el filtro manual en la pantalla de actividades.
// - sin options (o sin estos campos): devuelve todas las actividades.
exports.getAllUserActivities = async function (options = {}) {
    try {
        const query = {};
        const { days, startDate, endDate } = options;

        if (days != null && Number.isInteger(days) && days > 0) {
            const since = new Date();
            since.setDate(since.getDate() - days);
            since.setHours(0, 0, 0, 0);
            query.timestamp = { $gte: since };
        } else if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            query.timestamp = { $gte: start, $lte: end };
        }

        const activities = await UserActivity.find(query).sort({ timestamp: -1 });
        console.log('SERVICIO: Actividades de usuario obtenidas correctamente');
        return activities;
    } catch (error) {
        console.error('SERVICIO: Error al obtener las actividades de usuario:', error);
        throw error;
    }
}
