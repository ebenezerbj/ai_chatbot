import 'dotenv/config';
import { analyticsService } from '../src/services/analyticsService';

const a = analyticsService.getAnalytics();
console.log(JSON.stringify(a, null, 2));
