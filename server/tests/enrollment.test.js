const {
  app,
  request,
  connectTestDb,
  clearTestDb,
  closeTestDb,
  createUserAndLogin,
  createCourse,
} = require('./helpers');
const Enrollment = require('../src/models/Enrollment');

beforeAll(connectTestDb, 120000);
afterEach(clearTestDb);
afterAll(closeTestDb);

let student;
let instructor;
let course;
let lessons;

beforeEach(async () => {
  student = await createUserAndLogin('student');
  instructor = await createUserAndLogin('instructor');
  ({ course, lessons } = await createCourse(instructor.user));
});

const enroll = (auth, courseId) =>
  request(app).post('/api/enrollments').set('Authorization', auth).send({ courseId });
const lessonUrl = (courseId, lessonId) => `/api/courses/${courseId}/lessons/${lessonId}`;

describe('POST /api/enrollments', () => {
  it('enrolls a student in a published course', async () => {
    const res = await enroll(student.auth, course._id);

    expect(res.status).toBe(201);
    expect(res.body.enrollment.progressPercent).toBe(0);
  });

  it('rejects enrolling twice', async () => {
    await enroll(student.auth, course._id);
    const res = await enroll(student.auth, course._id);

    expect(res.status).toBe(409);
    expect(await Enrollment.countDocuments()).toBe(1);
  });

  it('enforces one enrollment per course in the database, even for simultaneous requests', async () => {
    const results = await Promise.all([
      enroll(student.auth, course._id),
      enroll(student.auth, course._id),
      enroll(student.auth, course._id),
    ]);

    expect(results.filter((res) => res.status === 201)).toHaveLength(1);
    expect(await Enrollment.countDocuments()).toBe(1);
  });

  it('rejects enrolling in an unpublished course', async () => {
    const { course: draft } = await createCourse(instructor.user, { isPublished: false });
    const res = await enroll(student.auth, draft._id);

    expect(res.status).toBe(404);
  });

  it('only allows students to enroll', async () => {
    const res = await enroll(instructor.auth, course._id);

    expect(res.status).toBe(403);
  });

  it('requires logging in', async () => {
    const res = await request(app).post('/api/enrollments').send({ courseId: course._id });

    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/enrollments/:courseId', () => {
  it('unenrolls a student', async () => {
    await enroll(student.auth, course._id);
    const res = await request(app)
      .delete(`/api/enrollments/${course._id}`)
      .set('Authorization', student.auth);

    expect(res.status).toBe(200);
    expect(await Enrollment.countDocuments()).toBe(0);
  });

  it('returns 404 when the student was not enrolled', async () => {
    const res = await request(app)
      .delete(`/api/enrollments/${course._id}`)
      .set('Authorization', student.auth);

    expect(res.status).toBe(404);
  });
});

describe('Access to lesson content', () => {
  it('never includes lesson content in the public course outline', async () => {
    const res = await request(app).get(`/api/courses/${course._id}`);

    expect(res.status).toBe(200);
    expect(res.body.course.lessons).toHaveLength(2);
    expect(JSON.stringify(res.body)).not.toContain('Secret content');
  });

  it('blocks lesson content until the student enrolls', async () => {
    const url = lessonUrl(course._id, lessons[0]._id);

    const before = await request(app).get(url).set('Authorization', student.auth);
    expect(before.status).toBe(403);

    await enroll(student.auth, course._id);

    const after = await request(app).get(url).set('Authorization', student.auth);
    expect(after.status).toBe(200);
    expect(after.body.lesson.content).toContain('Secret content');
  });

  it('blocks other instructors but allows the course owner', async () => {
    const other = await createUserAndLogin('instructor', 'other@test.com');
    const url = lessonUrl(course._id, lessons[0]._id);

    const otherRes = await request(app).get(url).set('Authorization', other.auth);
    const ownerRes = await request(app).get(url).set('Authorization', instructor.auth);

    expect(otherRes.status).toBe(403);
    expect(ownerRes.status).toBe(200);
  });

  it('does not let an enrollment in one course unlock a lesson from another', async () => {
    const { lessons: otherLessons } = await createCourse(instructor.user);
    await enroll(student.auth, course._id);

    const res = await request(app)
      .get(lessonUrl(course._id, otherLessons[0]._id))
      .set('Authorization', student.auth);

    expect(res.status).toBe(404);
  });

  it('hides unpublished courses from the public', async () => {
    const { course: draft } = await createCourse(instructor.user, { isPublished: false });

    const detail = await request(app).get(`/api/courses/${draft._id}`);
    const catalogue = await request(app).get('/api/courses');

    expect(detail.status).toBe(404);
    expect(catalogue.body.courses.map((c) => c._id)).not.toContain(String(draft._id));
  });
});
