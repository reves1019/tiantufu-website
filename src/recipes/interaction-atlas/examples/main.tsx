import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LearningGallery } from './LearningGallery'

const root = document.getElementById('learning-root')
if (!root) throw new Error('Missing learning-root')
createRoot(root).render(<StrictMode><LearningGallery /></StrictMode>)
