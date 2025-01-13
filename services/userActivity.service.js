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