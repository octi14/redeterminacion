const userActivityService = require('../services/userActivity.service');

// Controlador para manejar la creación de una nueva actividad de usuario
exports.createUserActivity = async function (req, res) {
    try {
        console.log("createUserActivity CALLED -> req.body: " + req.body)
        const activityData = req.body; // Suponiendo que los datos de la actividad se pasan en el cuerpo de la solicitud
        await userActivityService.logUserActivity(activityData);
        res.status(201).json({ message: 'Actividad de usuario creada exitosamente' });
    } catch (error) {
        console.error('Error al crear la actividad de usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}