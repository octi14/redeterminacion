const UserActivity = require('../models/userActivity.model');

// Método para registrar una nueva actividad de usuario
exports.logUserActivity = async function (data) {
    try {
        const newActivity = new UserActivity(data);
        await newActivity.save();
        console.log('Actividad de usuario registrada correctamente');
    } catch (error) {
        console.error('Error al registrar la actividad de usuario:', error);
    }
}