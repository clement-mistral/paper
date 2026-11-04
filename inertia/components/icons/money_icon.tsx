import Icon, { type IconProps } from '~/components/icons/icon'

export default function MoneyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h13v4" />
      <path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z" />
      <circle cx="16" cy="14.5" r="1.2" />
    </Icon>
  )
}
