'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, FileText, ImageIcon, Loader2 } from 'lucide-react'

interface FileUploadProps {
  label: string
  accept?: Record<string, string[]>
  onFileUploaded: (file: File, text: string, thumbnailUrl?: string, pdfUrl?: string, fullPagePreviewUrl?: string) => void
  onFileRemoved: () => void
  currentFile?: { name: string; text: string }
  maxSize?: number
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const DEFAULT_ACCEPT = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
}

export default function FileUpload({
  label,
  accept = DEFAULT_ACCEPT,
  onFileUploaded,
  onFileRemoved,
  currentFile,
  maxSize = 10 * 1024 * 1024,
}: FileUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [processingLabel, setProcessingLabel] = useState('Processing...')

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setIsProcessing(true)

      try {
        if (file.type === 'text/plain') {
          const text = await file.text()
          onFileUploaded(file, text)
        } else if (IMAGE_TYPES.includes(file.type)) {
          // Show local preview immediately
          const previewUrl = URL.createObjectURL(file)
          setImagePreview(previewUrl)
          setProcessingLabel('Reading your resume...')

          const formData = new FormData()
          formData.append('file', file)

          const response = await fetch('/api/extract-text', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to read image')
          }

          const data = await response.json()
          onFileUploaded(file, data.text)
        } else if (file.type === 'application/pdf') {
          setProcessingLabel('Extracting resume...')
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
          onFileUploaded(file, data.text, data.thumbnailUrl, data.pdfUrl, data.fullPagePreviewUrl)
        }
      } catch (error: any) {
        console.error('Error processing file:', error)
        setImagePreview(null)
        alert(error.message || 'Error processing file. Please try again.')
      } finally {
        setIsProcessing(false)
        setProcessingLabel('Processing...')
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

  const handleRemove = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    }
    onFileRemoved()
  }

  const isImage = currentFile && IMAGE_TYPES.some(t => currentFile.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/))

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}

      {currentFile ? (
        <div className="flex items-center justify-between p-3 border border-emerald-200 rounded-xl bg-emerald-50">
          <div className="flex items-center gap-2.5 min-w-0">
            {isImage
              ? <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
              : <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
            }
            <span className="text-sm text-emerald-800 font-medium truncate">{currentFile.name}</span>
          </div>
          <button
            onClick={handleRemove}
            className="text-emerald-400 hover:text-red-500 transition-colors ml-2 shrink-0"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragActive
              ? 'border-primary-400 bg-primary-50 scale-[1.01]'
              : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50 bg-white'
          } ${isProcessing ? 'pointer-events-none' : ''}`}
        >
          <input {...getInputProps()} disabled={isProcessing} />

          {isProcessing ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              <p className="text-sm font-medium text-primary-600">{processingLabel}</p>
            </div>
          ) : isDragActive ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="text-3xl">📄</div>
              <p className="text-sm font-semibold text-primary-600">Drop it!</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-2 justify-center mb-1">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gray-400" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-700">
                Drop a file or tap to browse
              </p>
              <p className="text-xs text-gray-400">
                PDF, screenshot, or photo of your resume
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
