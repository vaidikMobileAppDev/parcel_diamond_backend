import express from 'express';
const routes = express.Router();

import authRoutes from './auth.routes.js';
routes.use('/auth', authRoutes);

import employeeRoutes from './employee.routes.js';
routes.use('/employees', employeeRoutes);

import customerRoutes from './customer.routes.js';
routes.use('/customers', customerRoutes);

import customerMastersRoutes from './appConfiguration/customer_masters.routes.js';
routes.use('/configuration--customer_masters', customerMastersRoutes);
import globalRoutes from './appConfiguration/global.routes.js';
routes.use('/configuration--global', globalRoutes);
import customCouponCodeRoutes from './appConfiguration/custom_coupon_code.routes.js';
routes.use('/configuration--custom_coupon_code', customCouponCodeRoutes);
import sieveSizeRoutes from './appConfiguration/sieve_size.routes.js';
routes.use('/configuration--sieve_size', sieveSizeRoutes);
import colorRoutes from './appConfiguration/color.routes.js';
routes.use('/configuration--color', colorRoutes);
import shapeRoutes from './appConfiguration/shape.routes.js';
routes.use('/configuration--shape', shapeRoutes);
import clarityRoutes from './appConfiguration/clarity.routes.js';
routes.use('/configuration--clarity', clarityRoutes);
import supplierCategoryRoutes from './appConfiguration/supplier_category.routes.js';
routes.use('/configuration--supplier_category', supplierCategoryRoutes);
import countryRoutes from './appConfiguration/country.routes.js';
routes.use('/configuration--country', countryRoutes);
import locationRoutes from './appConfiguration/location.routes.js';
routes.use('/configuration--location', locationRoutes);
import regionRoutes from './appConfiguration/region.routes.js';
routes.use('/configuration--region', regionRoutes);
import pricePerCaratRegionoutes from './appConfiguration/pricePerCaratRegion.routes.js';
routes.use('/configuration--price_per_carat', pricePerCaratRegionoutes);
import orderStatusCaptionRoutes from './appConfiguration/order_status_caption.routes.js';
routes.use('/configuration--order_status_caption', orderStatusCaptionRoutes);
import packetStatusRoutes from './appConfiguration/packet_status.routes.js';
routes.use('/configuration--packet_status', packetStatusRoutes);

import faqsRoutes from './faqs.routes.js';
routes.use('/faqs', faqsRoutes);

import enquiryRoutes from './enquiry.routes.js';
routes.use('/enquiry--diamond_enquiry', enquiryRoutes);
routes.use('/enquiry--general_enquiry', enquiryRoutes);

import newsLatterRoutes from './newsLetter.routes.js';
routes.use('/news_letter', newsLatterRoutes);

import supplierRoutes from './supplier.routes.js';
routes.use('/accounting-supplier_management--supplier_details', supplierRoutes);

import productRoutes from './product.routes.js';
routes.use('/products--product_list', productRoutes);
routes.use('/products--purchase_history', productRoutes);

import dashboardRoutes from './dashboard.routes.js';
routes.use('/dashboard', dashboardRoutes);

import orderRoutes from './order.routes.js';
routes.use('/order', orderRoutes);

export default routes;
