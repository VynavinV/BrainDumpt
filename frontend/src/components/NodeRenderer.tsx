import type { BoardNode } from '../types'
import TextNode from './nodes/TextNode'
import ImageNode from './nodes/ImageNode'
import AudioNode from './nodes/AudioNode'
import ListNode from './nodes/ListNode'
import CodeNode from './nodes/CodeNode'
import LinkNode from './nodes/LinkNode'

const renderers: Record<BoardNode['type'], React.FC<{ node: BoardNode }>> = {
  text: TextNode,
  image: ImageNode,
  audio: AudioNode,
  list: ListNode,
  code: CodeNode,
  link: LinkNode,
}

interface Props {
  node: BoardNode
}

export default function NodeRenderer({ node }: Props) {
  const Component = renderers[node.type]
  if (!Component) return null
  return <Component node={node} />
}
