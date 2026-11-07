const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.trim().length < 32 ||
    JWT_SECRET === 'Ntasdb&TAS)6dtb(A%RSDba8zdASTDbpasdoRASVDraDSoizp7dnobtasd') {
    throw new Error('Set JWT_SECRET to a unique random secret of at least 32 characters before starting Mellow.');
}

module.exports = { JWT_SECRET };
