import { NextFunction, Request, Response } from "express"
import formidable from "formidable"
import fse from "fs-extra"
import path from "path"
import settings from "../lib/settings"
import utils from "../lib/utils"

const contentPath = path.resolve(settings.filesUploadPath)

class FilesService {
  getFileData(fileName: string) {
    const filePath = `${contentPath}/${fileName}`
    const stats = fse.statSync(filePath)
    if (stats.isFile())
      return {
        file: fileName,
        size: stats.size,
        modified: stats.mtime,
      }

    return null
  }

  getFilesData(files) {
    return files
      .map(fileName => this.getFileData(fileName))
      .filter(fileData => fileData !== null)
      .sort((a, b) => a.modified - b.modified)
  }

  getFiles() {
    return new Promise((resolve, reject) => {
      fse.readdir(contentPath, (err, files) => {
        if (err) {
          reject(err)
        } else {
          const filesData = this.getFilesData(files)
          resolve(filesData)
        }
      })
    })
  }

  deleteFile(fileName: string) {
    return new Promise<void>((resolve, reject) => {
      const filePath = contentPath + "/" + fileName
      if (fse.existsSync(filePath)) {
        fse.unlink(filePath, err => {
          resolve()
        })
      } else {
        reject("File not found")
      }
    })
  }

  uploadFile(req: Request, res: Response, next: NextFunction) {
    const uploadDir = contentPath

    let form = new formidable.IncomingForm(),
      file_name = null,
      file_size = 0

    form.uploadDir = uploadDir

    form
      .on("fileBegin", (name, file) => {
        // Emitted whenever a field / value pair has been received.
        file.name = utils.getCorrectFileName(file.name)
        file.path = uploadDir + "/" + file.name
      })
      .on("file", (name, file) => {
        // every time a file has been uploaded successfully,
        file_name = file.name
        file_size = file.size
      })
      .on("error", error => {
        res.status(500).send(this.getErrorMessage(error))
      })
      .on("end", () => {
        //Emitted when the entire request has been received, and all contained files have finished flushing to disk.
        if (file_name) {
          res.send({ file: file_name, size: file_size })
        } else {
          res
            .status(400)
            .send(this.getErrorMessage("Required fields are missing!"))
        }
      })

    form.parse(req)
  }

  getErrorMessage(error: string) {
    return { error: true, message: error.toString() }
  }
}

export default new FilesService()
