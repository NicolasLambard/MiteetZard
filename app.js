app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/menu', require('./controllers/productController').getActiveProducts); 