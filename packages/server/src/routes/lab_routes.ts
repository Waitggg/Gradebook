import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
    getStudentLabs,
    getStudentLabById,
    submitLabWork,
    getMySubmission,
    getMyGrade,
    getSubjects,
    createLab,
    updateLab,
    deleteLab, getAllLabs,
    getTeacherLabs, getLabSubmissionsForTeacher, gradeSubmission
} from '../controllers/lab_controller';

const router = Router();

const uploadDir = path.join(__dirname, '../../uploads/labs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/subjects', getSubjects);
router.get('/all', getAllLabs);
router.get('/teacher', getTeacherLabs);
router.get('/teacher/:id/submissions', getLabSubmissionsForTeacher);
router.post('/submission/:id/grade', gradeSubmission);
router.get('/', getStudentLabs);
router.post('/', createLab);
router.put('/:id', updateLab);
router.delete('/:id', deleteLab);
router.get('/:id', getStudentLabById);
router.post('/:id/submit', upload.single('file'), submitLabWork);
router.get('/:id/submission', getMySubmission);
router.get('/:id/grade', getMyGrade);

export default router;