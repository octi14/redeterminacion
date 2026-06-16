const userActivityService = require('../services/userActivity.service'); // Importa el servicio
const { getCachedConfig } = require('../services/configs.service');

exports.createUserActivity = async (req, res) => {
    try {
        const isFeatureEnabled = getCachedConfig('logActivityEnabled');
        if (!isFeatureEnabled) {
            return res.status(203).json({ message: 'Funcionalidad deshabilitada.' });
        }
        const { userId, actionType, actionResult, sessionId, visitedUrl, deviceInfo } = req.body;

        // Crear un nuevo documento de actividad
        const data = {
            userId,
            actionType,
            actionResult,
            sessionId,
            visitedUrl,
            deviceInfo,
        };

        // Usar el servicio para guardar los datos
        await userActivityService.logUserActivity(data);

        res.status(201).json({ message: 'CONTROLLER: Log de actividad registrado correctamente.' });
    } catch (error) {
        console.error('Error al guardar el log de actividad:', error);
        res.status(500).json({ message: 'CONTROLLER: Error al registrar el log de actividad.' });
    }
};

// GET /user-activities — Soporta query params para no traer todo el historial de una vez:
// - days: solo actividades de los últimos N días (ej. ?days=30). Por defecto el front pide 30.
// - startDate, endDate: rango de fechas para el filtro manual (Aplicar Filtro en la UI).
// - Sin params: devuelve todas las actividades (opción "Mostrar todas").
exports.getAllUserActivities = async (req, res) => {
    try {
        const { days, startDate, endDate } = req.query;
        const options = {};
        if (days != null) options.days = parseInt(days, 10);
        if (startDate) options.startDate = startDate;
        if (endDate) options.endDate = endDate;
        const activities = await userActivityService.getAllUserActivities(options);
        res.status(200).json({
            message: 'CONTROLLER: Actividades de usuario obtenidas correctamente.',
            data: activities
        });
    } catch (error) {
        console.error('Error al obtener las actividades de usuario:', error);
        res.status(500).json({ message: 'CONTROLLER: Error al obtener las actividades de usuario.' });
    }
};
