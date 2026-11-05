const {
  app,
  request,
  connectTestDb,
  clearTestDb,
  closeTestDb,
  createUserAndLogin,
  createCourse,
} = require('./helpers');
const { calculatePercent } = require('../src/services/progressService');

beforeAll(connectTestDb, 120000);
afterEach(clearTestDb);
afterAll(closeTestDb);

let student;
let instructor;
let course;
let lessons;

// Start each test with a student enrolled in a course of four lessons.
beforeEach(async () => {
  student = await createUserAndLogin('student');
  instructor = await createUserAndLogin('instructor');
  ({ course, lessons } = await createCourse(instructor.user, { lessonCount: 4 }));
  await request(app)
    .post('/api/enrollments')
    .set('Authorization', student.auth)
    .send({ courseId: course._id });
});

const complete = (lesson, auth = student.auth) =>
  request(app)
    .post(`/api/progress/${course._id}/lessons/${lesson._id}/complete`)
    .set('Authorization', auth);

const getProgress = async () => {
  const res = await request(app).get(`/api/progress/${course._id}`).set('Authorization', student.auth);
  return res.body.progress;
};

describe('Marking lessons complete', () => {
  it('updates the percentage', async () => {
    const res = await complete(lessons[0]);

    expect(res.status).toBe(200);
    expect(res.body.progress.progressPercent).toBe(25);
    expect(res.body.progress.completedLessons).toEqual([String(lessons[0]._id)]);
  });

  it('does not double-count a lesson completed twice', async () => {
    await complete(lessons[0]);
    const res = await complete(lessons[0]);

    expect(res.body.progress.progressPercent).toBe(25);
    expect(res.body.progress.completedLessons).toHaveLength(1);
  });

  it('can be undone', async () => {
    await complete(lessons[0]);
    const res = await request(app)
      .delete(`/api/progress/${course._id}/lessons/${lessons[0]._id}/complete`)
      .set('Authorization', student.auth);

    expect(res.body.progress.progressPercent).toBe(0);
    expect(res.body.progress.completedLessons).toHaveLength(0);
  });

  it('sets the completion date only when every lesson is done', async () => {
    await Promise.all(lessons.slice(0, 3).map((lesson) => complete(lesson)));
    expect((await getProgress()).completedAt).toBeNull();

    const res = await complete(lessons[3]);
    expect(res.body.progress.progressPercent).toBe(100);
    expect(res.body.progress.completedAt).not.toBeNull();
  });

  it('keeps the percentage correct when requests overlap', async () => {
    await Promise.all(lessons.map((lesson) => complete(lesson)));

    const progress = await getProgress();
    expect(progress.completedLessons).toHaveLength(4);
    expect(progress.progressPercent).toBe(100);
  });

  it('rejects students who are not enrolled', async () => {
    const outsider = await createUserAndLogin('student', 'outsider@test.com');
    const res = await complete(lessons[0], outsider.auth);

    expect(res.status).toBe(403);
  });

  it('rejects a lesson from a different course', async () => {
    const { lessons: otherLessons } = await createCourse(instructor.user);
    const res = await complete(otherLessons[0]);

    expect(res.status).toBe(404);
  });
});

describe('Continue where you left off', () => {
  const access = (lesson) =>
    request(app)
      .put(`/api/progress/${course._id}/lessons/${lesson._id}/access`)
      .set('Authorization', student.auth);

  it('starts at the first lesson', async () => {
    expect((await getProgress()).continueLesson._id).toBe(String(lessons[0]._id));
  });

  it('returns to the unfinished lesson last opened', async () => {
    await access(lessons[2]);
    expect((await getProgress()).continueLesson._id).toBe(String(lessons[2]._id));
  });

  it('moves on to the next lesson once the last one opened is finished', async () => {
    await access(lessons[1]);
    await complete(lessons[1]);
    expect((await getProgress()).continueLesson._id).toBe(String(lessons[2]._id));
  });
});

describe('Keeping progress correct when lessons change', () => {
  const asInstructor = (req) => req.set('Authorization', instructor.auth);

  it('lowers the percentage when a new lesson is added', async () => {
    await Promise.all(lessons.map((lesson) => complete(lesson)));
    expect((await getProgress()).progressPercent).toBe(100);

    await asInstructor(request(app).post(`/api/courses/${course._id}/lessons`)).send({
      title: 'Bonus lesson',
      content: 'New material',
    });

    const progress = await getProgress();
    expect(progress.progressPercent).toBe(80);
    expect(progress.completedAt).toBeNull();
  });

  it('removes a deleted lesson from progress and recalculates', async () => {
    await complete(lessons[0]);
    await asInstructor(request(app).delete(`/api/courses/${course._id}/lessons/${lessons[0]._id}`));

    const progress = await getProgress();
    expect(progress.completedLessons).toHaveLength(0);
    expect(progress.progressPercent).toBe(0);
    expect(progress.lastAccessedLesson).toBeNull();
  });

  it('completes the course if the only unfinished lesson is deleted', async () => {
    await Promise.all(lessons.slice(0, 3).map((lesson) => complete(lesson)));
    await asInstructor(request(app).delete(`/api/courses/${course._id}/lessons/${lessons[3]._id}`));

    const progress = await getProgress();
    expect(progress.progressPercent).toBe(100);
    expect(progress.completedAt).not.toBeNull();
  });

  it('renumbers lessons after a deletion', async () => {
    await asInstructor(request(app).delete(`/api/courses/${course._id}/lessons/${lessons[1]._id}`));
    const res = await request(app).get(`/api/courses/${course._id}/lessons`);

    expect(res.body.lessons.map((lesson) => lesson.order)).toEqual([1, 2, 3]);
  });
});

describe('Instructor views of progress', () => {
  it('shows the course owner student progress and the average', async () => {
    await complete(lessons[0]);

    const students = await request(app)
      .get(`/api/courses/${course._id}/students`)
      .set('Authorization', instructor.auth);
    const managed = await request(app)
      .get('/api/courses/managed')
      .set('Authorization', instructor.auth);

    expect(students.body.students[0].progressPercent).toBe(25);
    expect(students.body.students[0].student.email).toBe(student.user.email);
    expect(managed.body.courses[0].enrollmentCount).toBe(1);
    expect(managed.body.courses[0].averageProgress).toBe(25);
  });

  it("does not show other instructors a course's students", async () => {
    const other = await createUserAndLogin('instructor', 'other@test.com');
    const res = await request(app)
      .get(`/api/courses/${course._id}/students`)
      .set('Authorization', other.auth);

    expect(res.status).toBe(403);
  });
});

describe('calculatePercent', () => {
  it('only reaches 100 when everything is complete', () => {
    expect(calculatePercent(199, 200)).toBe(99);
    expect(calculatePercent(200, 200)).toBe(100);
  });

  it('handles a course with no lessons', () => {
    expect(calculatePercent(0, 0)).toBe(0);
  });
});
