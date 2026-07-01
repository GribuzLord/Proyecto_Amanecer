require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const personRoutes = require('./routes/person.routes');
const programRoutes = require('./routes/program.routes');
const errorMiddleware = require('./middleware/error.middleware');
const AppError = require('./utils/AppError');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/personas', personRoutes);
app.use('/api/programas', programRoutes);

app.all('*', (req, res, next) => {
  next(new AppError(`Ruta no encontrada: ${req.originalUrl}`, 404));
});

app.use(errorMiddleware);

module.exports = app;
