'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText } from 'lucide-react'

interface FileUploadProps {
  label: string
  accept?: Record<string, string[]>
  onFileUploaded: (file: File, text: string, thumbnailUrl?: string, pdfUrl?: string, fullPagePreviewUrl?: string) => void
  onFileRemoved: () => void
  currentFile?: { name: string; text: string }
  maxSize?: number // in bytes
}

export default function FileUpload({
  label,
  accept = { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] },
  onFileUploaded,
  onFileRemoved,
  currentFile,
  maxSize = 10 * 1024 * 1024, // 10MB default
}: FileUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setIsProcessing(true)

      try {
        let text = ''

        if (file.type === 'text/plain') {
          // Read text file
          text = await file.text()
        } else if (file.type === 'application/pdf') {
          // For PDF, extract text and thumbnail on the server
          const formData = new FormData()
          formData.append('file', file)

          const response = await fetch('/api/extract-text', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            throw new Error('Failed to extract text from PDF')
          }

          const data = await response.json()
          text = data.text
          onFileUploaded(file, text, data.thumbnailUrl, data.pdfUrl, data.fullPagePreviewUrl)
          return
        }

        onFileUploaded(file, text)
      } catch (error) {
        console.error('Error processing file:', error)
        alert('Error processing file. Please try again.')
      } finally {
        setIsProcessing(false)
      }
    },
    [onFileUploaded]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
  })

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      {currentFile ? (
        <div className="flex items-center justify-between p-4 border border-gray-300 rounded-md bg-gray-50">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-700">{currentFile.name}</span>
          </div>
          <button
            onClick={onFileRemoved}
            className="text-red-600 hover:text-red-800"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} disabled={isProcessing} />
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            {isDragActive
              ? 'Drop the file here'
              : isProcessing
              ? 'Processing file...'
              : 'Drag and drop a file here, or click to select'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            PDF or TXT files up to 10MB
          </p>
        </div>
      )}
    </div>
  )
}

