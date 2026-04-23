// src/controllers/admin/dashboardController.js
import dashboard from '~/services/admin/dashboardService';

const respond = (res, data, message = 'Fetched successfully') =>
	res.json({ success: true, data, message });

const fail = (res, err) =>
	res.status(err.status || 400).json({
		success: false,
		data: {},
		message: err.message || 'Failed',
	});

export const overview = async (req, res) => {
	try {
		return respond(res, await dashboard.overview(), 'Dashboard overview fetched');
	} catch (err) {
		return fail(res, err);
	}
};

export const userGrowth = async (req, res) => {
	try {
		return respond(res, await dashboard.userGrowth({ period: req.query.period }), 'User growth fetched');
	} catch (err) {
		return fail(res, err);
	}
};

export const activitySummary = async (req, res) => {
	try {
		const days = parseInt(req.query.days, 10) || 7;
		return respond(res, await dashboard.activitySummary({ days }), 'Activity summary fetched');
	} catch (err) {
		return fail(res, err);
	}
};

export const topFeatures = async (req, res) => {
	try {
		const days = parseInt(req.query.days, 10) || 30;
		return respond(res, await dashboard.topFeatures({ days }), 'Top features fetched');
	} catch (err) {
		return fail(res, err);
	}
};

export const novaCoinsFlow = async (req, res) => {
	try {
		const days = parseInt(req.query.days, 10) || 7;
		return respond(res, await dashboard.novaCoinsFlow({ days }), 'NovaCoins flow fetched');
	} catch (err) {
		return fail(res, err);
	}
};

export default { overview, userGrowth, activitySummary, topFeatures, novaCoinsFlow };
