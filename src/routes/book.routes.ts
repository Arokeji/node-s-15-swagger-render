/**
 * @swagger
 * tags:
 *   name: Book
 *   description: Books management
 */

import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import fs from "fs";

// Modelos
import { Book } from "../models/mongo/Book";
import { Author } from "../models/mongo/Author";

// Export de rutas
export const bookRoutes = express.Router();

// Configuracion de Multer para subida de archivos
const upload = multer({ dest: "public" });

// Rutas

/**
 * @swagger
 * /book/{id}:
 *   get:
 *     summary: Get a specific book by ID
 *     tags: [Book]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the book
 *     responses:
 *       200:
 *         description: The book data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       404:
 *         description: Book not found
 */
bookRoutes.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.id;

  try {
    const book = await Book.findById(id).populate("author");

    if (book) {
      const author = await Author.findById(book.author); // en vez de { author: id }
      const tempBook = book.toObject();
      tempBook.author = author as any;
      res.json(tempBook);
    } else {
      res.status(404).json({});
    }
  } catch (error) {
    next(error);
  }
});

bookRoutes.get("/", (req: Request, res: Response, next: NextFunction) => {
  console.log("Estamos en el middleware /book que comprueba parámetros");

  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    if (!isNaN(page) && !isNaN(limit) && page > 0 && limit > 0) {
      req.query.page = page as any;
      req.query.limit = limit as any;
      next();
    } else {
      console.log("Parámetros no válidos:");
      console.log(JSON.stringify(req.query));
      res.status(400).json({ error: "Params page or limit are not valid" });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /book:
 *   get:
 *     summary: List all books
 *     tags: [Book]
 *     responses:
 *       200:
 *         description: List with all the books
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Book'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
bookRoutes.get("/", async (req: Request, res: Response) => {
  try {
    // Lectura de query parameters
    const { page, limit } = req.query as any;
    const books = await Book.find()
      .limit(limit)
      .skip((page - 1) * limit)
      .populate("author");

    // Conteo del total de elementos
    const totalElements = await Book.countDocuments();

    // response se divide en pagination y data para tener dos objetos diferentes en swagger
    const response = {
      pagination: {
        totalItems: totalElements,
        totalPages: Math.ceil(totalElements / limit),
        currentPage: page,
      },
      data: books,
    };

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
});

/**
 * @swagger
 * /book:
 *   post:
 *     summary: Create a new book
 *     tags: [Book]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Book'
 *     responses:
 *       200:
 *         description: The created book
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 */
bookRoutes.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      pages: req.body.pages,
      rating: req.body.rating,
      publisher: {
        name: req.body.publisher.name,
        category: req.body.publisher.category,
      },
    });

    const createdBook = await book.save();
    return res.status(200).json(createdBook);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /book/title/{title}:
 *   get:
 *     summary: Get books by title
 *     tags: [Book]
 *     parameters:
 *       - in: path
 *         name: title
 *         schema:
 *           type: string
 *         required: true
 *         description: Title of the book
 *     responses:
 *       200:
 *         description: The list of books
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Book'
 *       404:
 *         description: No books found with the specified title
 */
bookRoutes.get("/title/:title", async (req: Request, res: Response, next: NextFunction) => {
  const title = req.params.title;

  try {
    const book = await Book.find({ title: new RegExp("^" + title.toLowerCase(), "i") }).populate("author");
    if (book) {
      res.json(book);
    } else {
      res.status(404).json({});
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /book/{id}:
 *   delete:
 *     summary: Delete a specific book by ID
 *     tags: [Book]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the book
 *     responses:
 *       200:
 *         description: The deleted book
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       404:
 *         description: Book not found
 */
bookRoutes.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const bookDeleted = await Book.findByIdAndDelete(id);
    if (bookDeleted) {
      res.json(bookDeleted);
    } else {
      res.status(404).json({});
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /book/{id}:
 *   put:
 *     summary: Update a specific book by ID
 *     tags: [Book]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the book
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Book'
 *     responses:
 *       200:
 *         description: The updated book
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       404:
 *         description: Book not found
 */
bookRoutes.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const bookUpdated = await Book.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (bookUpdated) {
      res.json(bookUpdated);
    } else {
      res.status(404).json({});
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /book/{id}/upload:
 *   post:
 *     summary: Upload a cover image for a specific book
 *     tags: [Book]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the book
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: The updated book data with the uploaded cover image
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       404:
 *         description: Book not found
 */
bookRoutes.post("/cover-upload", upload.single("cover"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Renombrado de la imagen
    const originalName = req.file?.originalname as string;
    const path = req.file?.path as string;
    const newPath = `${path}_${originalName}`;
    // Asigna a la propiedad path el valor de newPath
    fs.renameSync(path, newPath);

    // Busqueda del libro por ID
    const bookId = req.body.bookId;
    const book = await Book.findById(bookId);

    if (book) {
      book.coverImage = newPath;
      await book.save();
      res.json(book);
      console.log("✅ Cover uploaded and added succesfully.");
    } else {
      // Borra la imagen si no existe el libro
      fs.unlinkSync(newPath);
      res.status(404).send("Book not found. Please specify another Id.");
    }
  } catch (error) {
    next(error);
  }
});
