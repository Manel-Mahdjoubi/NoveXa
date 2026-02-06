import pool from "../config/db.js";
import bcrypt from "bcrypt";

// CREATE STUDENT
export const createStudent = async (data) => {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const result = await pool.query(
    `INSERT INTO "Student" 
      (S_firstname, S_lastname, S_email, S_phone, S_password, S_birthdate) 
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [
      data.firstName,
      data.lastName,
      data.email,
      data.phone,
      hashedPassword,
      data.dateOfBirth,
    ]
  );

  return result.rows[0];
};

// CREATE TEACHER
export const createTeacher = async (data) => {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const result = await pool.query(
    `INSERT INTO "Teacher" 
      (T_firstname, T_lastname, T_email, T_phone, T_password, T_birthdate)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [
      data.firstName,
      data.lastName,
      data.email,
      data.phone,
      hashedPassword,
      data.dateOfBirth,
    ]
  );

  return result.rows[0];
};

// LOGIN
export const loginUser = async (email) => {
  const studentResult = await pool.query(
    `SELECT * FROM "Student" WHERE S_email = $1`,
    [email]
  );

  if (studentResult.rows.length > 0) {
    return { role: "student", user: studentResult.rows[0] };
  }

  const teacherResult = await pool.query(
    `SELECT * FROM "Teacher" WHERE T_email = $1`,
    [email]
  );

  if (teacherResult.rows.length > 0) {
    return { role: "teacher", user: teacherResult.rows[0] };
  }

  return null;
};