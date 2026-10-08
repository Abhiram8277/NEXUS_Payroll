import { Router } from 'express';
import { MastersController } from './masters.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

// Departments
router.get('/departments', MastersController.getDepartments);
router.post('/departments', authorize(Role.ADMIN), MastersController.createDepartment);
router.put('/departments/:id', authorize(Role.ADMIN), MastersController.updateDepartment);
router.delete('/departments/:id', authorize(Role.ADMIN), MastersController.deleteDepartment);

// Designations
router.get('/designations', MastersController.getDesignations);
router.post('/designations', authorize(Role.ADMIN), MastersController.createDesignation);
router.put('/designations/:id', authorize(Role.ADMIN), MastersController.updateDesignation);
router.delete('/designations/:id', authorize(Role.ADMIN), MastersController.deleteDesignation);

// Locations
router.get('/locations', MastersController.getLocations);
router.post('/locations', authorize(Role.ADMIN), MastersController.createLocation);
router.put('/locations/:id', authorize(Role.ADMIN), MastersController.updateLocation);
router.delete('/locations/:id', authorize(Role.ADMIN), MastersController.deleteLocation);

// Leave Types
router.get('/leave-types', MastersController.getLeaveTypes);
router.post('/leave-types', authorize(Role.ADMIN), MastersController.createLeaveType);
router.put('/leave-types/:id', authorize(Role.ADMIN), MastersController.updateLeaveType);
router.delete('/leave-types/:id', authorize(Role.ADMIN), MastersController.deleteLeaveType);

// Salary Components
router.get('/salary-components', MastersController.getSalaryComponents);
router.post('/salary-components', authorize(Role.ADMIN), MastersController.createSalaryComponent);
router.put('/salary-components/:id', authorize(Role.ADMIN), MastersController.updateSalaryComponent);
router.delete('/salary-components/:id', authorize(Role.ADMIN), MastersController.deleteSalaryComponent);

// Holidays
router.get('/holidays', MastersController.getHolidays);
router.post('/holidays', authorize(Role.ADMIN), MastersController.createHoliday);
router.delete('/holidays/:id', authorize(Role.ADMIN), MastersController.deleteHoliday);

export default router;
