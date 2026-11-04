import Icon, { type IconProps } from '~/components/icons/icon'

export default function RecipeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2-3 5s1 4 3 4v9" />
    </Icon>
  )
}
